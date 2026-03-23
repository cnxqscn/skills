# video-understand 技能

## 概述

通过多模态 Omni 模型理解视频/图片内容，用自然语言驱动输出任意所需结果——复刻视频的生成 Prompt、场景描述、音频转录、内容分析等。

当前实现基于 OpenRouter 上的 `xiaomi/mimo-v2-omni`，但工具本身可以改造为任何支持视频/图片输入的多模态模型（不限于 Omni 类型），只需替换模型 ID 和对应的 API 接入方式。

## 核心功能

把视频或图片交给模型，配合你的需求描述，直接生成所需内容：

- 复刻视频的生成 Prompt（用于 AI 视频生成工具）
- 视频内容理解与描述
- 音频转录
- 多媒体对比分析
- 其他自定义需求

## 使用方法

> 前置条件：`export OPENROUTER_API_KEY=your_api_key`

```bash
# 单视频
node scripts/openrouter-mimo-omni.js -p "你的需求" -v video.mp4

# 多图
node scripts/openrouter-mimo-omni.js -p "你的需求" -i img1.jpg -i img2.jpg

# 图片 + 视频混合
node scripts/openrouter-mimo-omni.js -p "你的需求" -i photo.jpg -v video.mp4

# 指定提取帧数
node scripts/openrouter-mimo-omni.js -p "你的需求" -v video.mp4 --frames 15
```

## 注意事项

- 需要安装 `ffmpeg`（用于大视频自动压缩）
- 需要设置 `OPENROUTER_API_KEY`

