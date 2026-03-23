#!/usr/bin/env node
/**
 * OpenRouter API 调用工具 - 简化版
 * 支持多图多视频混合发送，所有媒体通过 base64 编码
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ 配置 ============
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const ATTRIBUTION_HEADERS = {
  'HTTP-Referer': 'https://openclaw.ai',
  'X-OpenRouter-Title': 'OpenClaw',
  'X-OpenRouter-Categories': 'cli-agent',
};

const DEFAULT_MODEL = 'xiaomi/mimo-v2-omni';

// 视频压缩配置
const MAX_VIDEO_SIZE_MB = 10;  // 最大允许的视频大小 (MB)
const COMPRESS_TARGET_MB = 9;  // 压缩目标大小 (MB)，留点余量
const COMPRESS_RESOLUTION = '540p';  // 压缩分辨率

// ============ 参数解析 ============
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    prompt: '',
    images: [],      // 支持多个图片
    videos: [],      // 支持多个视频
    model: DEFAULT_MODEL,
    output: 'text',
    fps: 2,          // API fps 参数，范围 [2, 10]
    report: null,    // 指定报告输出路径（可选）
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--prompt' || arg === '-p') {
      config.prompt = args[++i];
    } else if (arg === '--image' || arg === '-i') {
      config.images.push(args[++i]);
    } else if (arg === '--video' || arg === '-v') {
      config.videos.push(args[++i]);
    } else if (arg === '--fps' || arg === '-f') {
      config.fps = Math.min(10, Math.max(2, parseInt(args[++i]) || 2));
    } else if (arg === '--model' || arg === '-m') {
      config.model = args[++i];
    } else if (arg === '--report' || arg === '-r') {
      config.report = args[++i];
    } else if (arg === '--json') {
      config.output = 'json';
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!config.prompt) {
    console.error('❌ 错误: 必须提供 --prompt 参数');
    process.exit(1);
  }

  if (!OPENROUTER_API_KEY) {
    console.error('❌ 错误: 未设置 OPENROUTER_API_KEY 环境变量');
    process.exit(1);
  }

  return config;
}

function printHelp() {
  console.log(`
OpenRouter API 调用工具 (简化版)

用法:
  node openrouter-mimo-omni.js [选项]

选项:
  --prompt, -p <文本>    提示词 (必需)
  --image, -i <文件>     图片文件路径 (可多次使用)
  --video, -v <文件>     视频文件路径 (可多次使用，整体 base64 上传)
  --fps, -f <数字>       视频帧率 (范围 [2, 10]，默认 2)
  --report, -r <文件>    分析报告输出路径（同时默认输出日志到当前目录）
  --model, -m <模型>     OpenRouter 模型 ID (默认: ${DEFAULT_MODEL})
  --json                 输出 JSON 格式
  --help, -h             显示帮助

示例:
  # 单视频分析，fps=10，保存报告
  node openrouter-mimo-omni.js -p "分析这个视频" -v video.mp4 -f 10 -r report.md

  # 单图片
  node openrouter-mimo-omni.js -p "描述这张图片" -i photo.jpg

  # 图片+视频混合
  node openrouter-mimo-omni.js -p "综合分析" -i photo.jpg -v video.mp4

`);
}

// ============ Token 估算 ============
// fps 有效范围: [2, 10]
function estimateVideoTokens(duration, width, height, fps = 2.0, mediaResolution = 'default', mute = false) {
  const PATCH = 16, MERGE = 2, T_PATCH = 2;
  const SPATIAL = PATCH * MERGE;                    // 32
  const PIX_PER_TOKEN = SPATIAL ** 2;               // 1024
  const MAX_TOTAL_TOKENS = 131072;
  const TOTAL_MAX_PIX = MAX_TOTAL_TOKENS * PIX_PER_TOKEN;
  const MIN_PIX = 8192, MAX_PIX = 8388608;
  const MAX_FRAMES = 2048;
  const DEFAULT_MAX_FRAME_TOKEN = 300;

  let nframes = Math.ceil(duration * fps);
  nframes = Math.min(nframes, MAX_FRAMES);
  nframes = Math.max(Math.ceil(nframes / T_PATCH) * T_PATCH, T_PATCH);

  let maxPix = TOTAL_MAX_PIX * T_PATCH / nframes;
  if (mediaResolution !== 'max') {
    maxPix = Math.min(maxPix, DEFAULT_MAX_FRAME_TOKEN * PIX_PER_TOKEN);
  }
  maxPix = Math.max(MIN_PIX, Math.min(maxPix, MAX_PIX));

  let h = height, w = width;
  if (Math.min(h, w) < SPATIAL) {
    if (h < w) { w = Math.floor(w * SPATIAL / h); h = SPATIAL; }
    else        { h = Math.floor(h * SPATIAL / w); w = SPATIAL; }
  }
  let hBar = Math.round(h / SPATIAL) * SPATIAL;
  let wBar = Math.round(w / SPATIAL) * SPATIAL;
  if (hBar * wBar > maxPix) {
    const beta = Math.sqrt(h * w / maxPix);
    hBar = Math.floor(h / beta / SPATIAL) * SPATIAL;
    wBar = Math.floor(w / beta / SPATIAL) * SPATIAL;
  } else if (hBar * wBar < MIN_PIX) {
    const beta = Math.sqrt(MIN_PIX / (h * w));
    hBar = Math.ceil(h * beta / SPATIAL) * SPATIAL;
    wBar = Math.ceil(w * beta / SPATIAL) * SPATIAL;
  }

  const grids = nframes / T_PATCH;
  const tokensPerGrid = Math.floor((hBar / PATCH) * (wBar / PATCH) / (MERGE ** 2));
  const vision = grids * tokensPerGrid;
  const timestamps = grids * (fps > 2 ? 5 : 3);
  const special = grids * 2 + 2;

  let audio = 0;
  if (!mute) {
    const specLen = Math.floor(duration * 24000 / 240) + 1;
    let t = Math.floor((specLen - 1) / 2) + 1;
    t = Math.floor(t / 2) + (t % 2 !== 0 ? 1 : 0);
    audio = Math.ceil(t / 4) + 2;
  }

  return Math.round(vision + timestamps + special + audio);
}

function getVideoInfo(videoPath) {
  const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of json "${videoPath}"`;
  const out = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
  return {
    duration: parseFloat(out.format.duration),
    width: out.streams[0].width,
    height: out.streams[0].height,
  };
}

// ============ 日志 / 报告输出 ============
function makeLogPath() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return path.join(process.cwd(), `mimo-${ts}.log`);
}

function saveOutput(logPath, reportPath, content) {
  fs.writeFileSync(logPath, content, 'utf8');
  console.error(`\n📄 日志已保存: ${logPath}`);
  if (reportPath) {
    fs.writeFileSync(reportPath, content, 'utf8');
    console.error(`📋 报告已保存: ${reportPath}`);
  }
}

// ============ 媒体处理 ============

function getFileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024);
}

async function compressVideo(videoPath, targetMB = COMPRESS_TARGET_MB) {
  const tempDir = path.join(__dirname, 'temp_compressed');
  fs.mkdirSync(tempDir, { recursive: true });

  const baseName = path.basename(videoPath, path.extname(videoPath));
  const compressedPath = path.join(tempDir, `${baseName}_compressed.mp4`);

  const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
  const duration = parseFloat(execSync(durationCmd, { encoding: 'utf8' }).trim());

  const targetBits = targetMB * 8 * 1024 * 1024;
  const targetBitrateK = Math.floor(targetBits / duration / 1000);

  console.log(`   📦 压缩参数: 时长=${duration.toFixed(1)}s, 目标码率=${targetBitrateK}k, 分辨率=${COMPRESS_RESOLUTION}`);
  console.log(`   🔄 正在压缩...`);

  const cmd = `ffmpeg -i "${videoPath}" -vf "scale=-2:540" -c:v libx264 -preset slow -b:v ${targetBitrateK}k -c:a aac -b:a 128k -y "${compressedPath}" 2>/dev/null`;
  execSync(cmd, { stdio: 'pipe' });

  console.log(`   ✅ 压缩完成: ${getFileSizeMB(compressedPath).toFixed(2)} MB`);
  return compressedPath;
}

async function processVideoFile(videoPath) {
  const sizeMB = getFileSizeMB(videoPath);
  console.log(`   📊 视频大小: ${sizeMB.toFixed(2)} MB`);

  if (sizeMB > MAX_VIDEO_SIZE_MB) {
    console.log(`   ⚠️  超过 ${MAX_VIDEO_SIZE_MB}MB 限制，开始压缩...`);
    const compressedPath = await compressVideo(videoPath);
    return { path: compressedPath, compressed: true };
  }

  return { path: videoPath, compressed: false };
}

// ============ API 调用 ============
async function sendMultiModal(options) {
  const { model, prompt, images, videos, fps } = options;

  const url = `${OPENROUTER_BASE_URL}/chat/completions`;
  const requestHeaders = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    ...ATTRIBUTION_HEADERS,
  };

  const content = [{ type: 'text', text: prompt }];

  for (const imgPath of images) {
    console.log(`   🖼️  处理图片: ${imgPath}`);
    const imgBase64 = fs.readFileSync(imgPath).toString('base64');
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imgBase64}` }
    });
  }

  for (const videoPath of videos) {
    console.log(`   🎬 处理视频: ${videoPath}`);

    const { path: processedPath, compressed } = await processVideoFile(videoPath);
    if (compressed) console.log(`   📁 使用压缩后的视频: ${processedPath}`);

    const videoBase64 = fs.readFileSync(processedPath).toString('base64');
    content.push({
      type: 'video_url',
      video_url: { url: `data:video/mp4;base64,${videoBase64}` },
      fps,
      media_resolution: 'default',
    });
  }

  const body = {
    model,
    messages: [{ role: 'user', content }],
  };

  console.log(`\n📡 请求信息:`);
  console.log(`   URL: ${url}`);
  console.log(`   Model: ${model}`);
  console.log(`   fps: ${fps}`);
  console.log(`   Content parts: ${content.length} 个 (text=1, images=${images.length}, videos=${videos.length})`);

  const response = await fetch(url, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return await response.json();
}

// ============ 主函数 ============
async function main() {
  const config = parseArgs();
  const logPath = makeLogPath();
  const lines = [];
  const log = (s = '') => { console.log(s); lines.push(s); };

  log('🔧 OpenRouter 工具 (简化版)');
  log('='.repeat(50));
  log(`\n🔍 Config:`);
  log(`   Images: ${config.images.length} 个`);
  log(`   Videos: ${config.videos.length} 个`);
  log(`   fps: ${config.fps} (范围 [2, 10])`);

  // Token 预估
  if (config.videos.length > 0) {
    log('\n📊 Token 预估 (发送前):');
    for (const v of config.videos) {
      try {
        const { duration, width, height } = getVideoInfo(v);
        const est = estimateVideoTokens(duration, width, height, config.fps);
        log(`   ${path.basename(v)}: ~${est.toLocaleString()} tokens (${duration.toFixed(1)}s, ${width}x${height}, fps=${config.fps})`);
      } catch (e) {
        log(`   ${path.basename(v)}: 无法估算 (${e.message})`);
      }
    }
  }

  try {
    const result = await sendMultiModal({
      model: config.model,
      prompt: config.prompt,
      images: config.images,
      videos: config.videos,
      fps: config.fps,
    });

    log('\n' + '='.repeat(50));
    log('📝 回复:');
    log('='.repeat(50));

    if (config.output === 'json') {
      const json = JSON.stringify(result, null, 2);
      log(json);
    } else {
      const replyContent = result.choices?.[0]?.message?.content || '无回复';
      log(replyContent);

      if (result.usage) {
        log('\n📊 Token 用量 (实际):');
        log(`   Prompt: ${result.usage.prompt_tokens?.toLocaleString()}`);
        log(`   Completion: ${result.usage.completion_tokens?.toLocaleString()}`);
        log(`   Total: ${result.usage.total_tokens?.toLocaleString()}`);
      }

      if (result.model) {
        log(`\n🤖 模型: ${result.model}`);
      }
    }

  } catch (error) {
    const msg = `\n❌ 错误: ${error.message}`;
    console.error(msg);
    lines.push(msg);
    saveOutput(logPath, config.report, lines.join('\n'));
    process.exit(1);
  }

  saveOutput(logPath, config.report, lines.join('\n'));
}

main();
