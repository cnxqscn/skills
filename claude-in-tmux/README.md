# Claude-in-Tmux

这是一个专为 **OpenClaw** 配置的技能，用于弥补 OpenClaw 在复杂编码任务上的能力短板。

## 背景

OpenClaw 是一个优秀的 AI Agent 框架，但在处理复杂的编程任务时可能存在局限性。本技能通过将 **Claude Code CLI** 封装为 OpenClaw 可调用的工具，让 OpenClaw 能够利用 Claude Code 强大的代码能力来完成复杂任务。

> **注意**：这是一个过渡方案。很快 OpenClaw 将原生支持直接链接到 Codex 或 Claude Code，届时将不再需要此封装层。

---

## 运行方式

### 1. 初始化配置

首次使用前，请完成以下配置：

```bash
# 1. 安装 Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# 2. 安装 tmux
# Ubuntu/Debian:
sudo apt-get install -y tmux
# macOS:
brew install tmux

# 3. 从模板创建配置文件
cp claude.sh.template claude.sh
chmod +x claude.sh

# 4. 配置环境变量（根据你要使用的模型选择）
# 示例：配置智谱 GLM-5
export Z_AI_API_KEY="your-z-ai-key"

# 示例：配置本地模型
export LOCAL_BASE_URL="http://localhost:5000"

# 自定义 tmux 中的 HOME 目录（可选）
export CLAUDE_TMUX_HOME="/home/youruser"
```

### 支持的模型及配置

| 模型 | 默认模型名 | Base URL | 环境变量 | 官网 |
|------|-----------|----------|----------|------|
| `kimi` | `kimi-for-coding` | `https://api.kimi.com/coding/` | `KIMI_API_KEY` | https://platform.moonshot.cn/ |
| `minimax` | `MiniMax-M2.5` | `https://api.minimaxi.com/anthropic` | `MINIMAX_API_KEY` | https://www.minimaxi.com/ |
| `glm5` | `GLM-5` | `https://api.z.ai/api/anthropic` | `Z_AI_API_KEY` | https://www.z.ai/ |

**配置步骤：**

```bash
# 选择你要使用的模型，设置对应的环境变量

# 使用 Kimi (推荐)
export KIMI_API_KEY="sk-your-kimi-key"

# 或使用 MiniMax
export MINIMAX_API_KEY="sk-your-minimax-key"

# 或使用 智谱 GLM-5
export Z_AI_API_KEY="your-z-ai-key"
```

### 2. 基本用法

```bash
# 后台运行任务（默认使用 kimi）
./claude.sh -p "检查代码中的bug"

# 使用其他模型
./claude.sh -m glm5 -p "优化这段代码"
./claude.sh -m minimax -p "重构代码"

# 指定会话名称，便于管理
./claude.sh -m kimi -p "优化性能" -s task-001

# 读取任务日志
./claude.sh -l              # 读取最新日志
./claude.sh -l -s task-001  # 读取指定会话

# 前台运行（不进入 tmux，适合快速任务）
./claude.sh -n -m glm5 -p "快速任务"

# 交互模式（无 tmux）
./claude.sh -m kimi -i
```

### 3. 管理运行中的会话

```bash
# 查看所有会话
tmux list-sessions

# 附加到运行中的会话
tmux attach -t claude-task-001

# 结束会话
tmux kill-session -t claude-task-001

# 实时查看日志
tail -f /tmp/tmux-logs/claude-*.log
```

---

## 工作原理

1. **OpenClaw 调用** → 通过 `claude.sh` 脚本发起任务
2. **tmux 会话** → 在独立的 tmux session 中后台运行 Claude Code
3. **日志记录** → 自动保存输出到 `/tmp/tmux-logs/`
4. **结果获取** → 通过 `-l` 参数读取任务日志获取结果

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `SKILL.md` | OpenClaw 技能定义文件 |
| `claude.sh.template` | 配置模板（需复制为 `claude.sh`） |
| `claude.sh` | 实际使用的包装脚本（从模板创建） |
| `README_for_Openclaw.md` | 详细的初始化配置指南 |

---

## 注意事项

- **Kimi** 是默认模型，使用 `-m kimi` 或省略 `-m` 参数
- 所有模型都需要设置对应的环境变量（`KIMI_API_KEY`、`MINIMAX_API_KEY` 或 `Z_AI_API_KEY`）
- 默认工作目录为当前目录，可通过 `CLAUDE_WORKSPACE` 环境变量修改
- 可通过 `CLAUDE_TMUX_HOME` 环境变量设置 tmux 会话中的 HOME 目录

---

## 未来展望

> 🔮 **即将过时**：OpenClaw 团队正在开发原生集成 Codex 和 Claude Code 的功能。一旦发布，你将可以直接在 OpenClaw 中调用这些工具，无需此封装层。
