---
name: claude-in-tmux
description: Run Claude Code CLI inside tmux sessions within Docker containers. Use this skill when the user wants to run Claude Code in a tmux session, check running tmux sessions, read logs from tmux sessions, or manage claude.sh wrapper script in OpenClaw agent containers.
---

# Claude-in-Tmux

在 OpenClaw Agent 容器中使用 tmux 运行 Claude Code CLI，实现后台任务执行和日志追踪。

## 核心功能

- 在 tmux session 中后台运行 Claude Code
- 自动记录日志到 `/tmp/tmux-logs/`
- 支持读取运行中的 session 日志
- 支持指定 session 名称便于管理
- 支持多种国内模型供应商（Kimi、MiniMax、智谱 GLM-5）

## 支持的模型
可以根据需要添加供应商

| 简写 | 供应商 | 说明 |
|------|--------|------|
| `glm5` | 智谱 GLM-5 | https://www.z.ai/ |
| `minimax` | MiniMax M2.5 | https://www.minimaxi.com/ |
| `kimi` | Kimi K2.5 | https://platform.moonshot.cn/ |

## 快速开始

### 1. 初始化配置

首次使用前，请阅读 `README_for_Openclaw.md` 完成初始化：

1. 安装 Claude Code: `curl -fsSL https://claude.ai/install.sh | bash`
2. 安装 tmux
3. 复制 `claude.sh.template` 为 `claude.sh`
4. 配置你的 API Key

### 2. 使用方法

```bash
# 后台运行任务（必需指定 -p 提示词）
./claude.sh -m glm5 -p "检查代码中的bug"

# 指定会话名称
./claude.sh -m minimax -p "优化性能" -s task-001

# 读取日志
./claude.sh -l
./claude.sh -l -s task-001

# 附加到运行中的会话
tmux attach -t claude-task-001
```

## 日志位置

```
/tmp/tmux-logs/<session>-<timestamp>.log
```

例如：`/tmp/tmux-logs/task-001-1710654315.log`

## 常用命令

```bash
# 查看所有会话
tmux list-sessions

# 检查 Claude 运行状态
tmux list-sessions | grep "^claude-"

# 读取最新日志
tail -n 50 /tmp/tmux-logs/claude-*.log

# 结束会话
tmux kill-session -t claude-task-001
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `claude.sh.template` | 配置模板，包含占位符 |
| `claude.sh` | 你的配置文件（从模板复制） |
| `README_for_Openclaw.md` | 详细的初始化指南 |

## 技术细节

- 工作目录: 当前目录（可通过 `CLAUDE_WORKSPACE` 配置）
- 运行用户: 建议使用非 root 用户
- Claude Code: 自动检测（需确保在 PATH 中）
- 必须环境变量: `HOME`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`

## 更多信息

详见 `README_for_Openclaw.md` 获取完整的配置指南和故障排除。
