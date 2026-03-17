# Claude-in-Tmux - OpenClaw Agent 配置指南

> 本指南供 OpenClaw Agent 阅读，帮助你在自己的环境中配置和使用 claude-in-tmux。

## 📋 概述

claude-in-tmux 是一个让 Claude Code CLI 在 tmux 会话中后台运行的工具。适合长时间编程任务、多任务并行、团队协作等场景。

本模板内置支持三个主流模型供应商：
- **Kimi** (月之暗面) - 默认模型，Coding 版本
- **MiniMax** - M2.5 模型
- **GLM-5** (智谱) - GLM-5 模型

## 🚀 初始化步骤

### 1. 安装 Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

安装完成后，Claude Code 会自动加入 PATH，脚本会自动检测。

### 2. 安装 tmux

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y tmux
```

**CentOS/RHEL/Rocky:**
```bash
sudo yum install -y tmux
```

**macOS:**
```bash
brew install tmux
```

**Alpine (Docker):**
```bash
apk add --no-cache tmux
```

### 3. 从模板创建脚本

```bash
cp claude.sh.template claude.sh
chmod +x claude.sh
```

### 4. 配置环境变量

选择一个你要使用的模型，设置对应的环境变量：

#### 使用 Kimi（默认，推荐）
```bash
# 获取 API Key: https://platform.moonshot.cn/
export KIMI_API_KEY="sk-your-kimi-api-key"
```

#### 使用 MiniMax
```bash
# 获取 API Key: https://www.minimaxi.com/
export MINIMAX_API_KEY="sk-your-minimax-api-key"
```

#### 使用 智谱 GLM-5
```bash
# 获取 API Key: https://www.z.ai/
export Z_AI_API_KEY="your-z-ai-key"
```

#### 持久化环境变量

将上述 `export` 命令添加到你的 shell 配置文件中：

```bash
# Bash
echo 'export KIMI_API_KEY="your-key"' >> ~/.bashrc

# Zsh
echo 'export KIMI_API_KEY="your-key"' >> ~/.zshrc

# 立即生效
source ~/.bashrc  # 或 source ~/.zshrc
```

### 5. 验证配置

```bash
# 检查 Claude Code
claude --version

# 检查 tmux
tmux -V

# 检查环境变量是否设置
echo $KIMI_API_KEY

# 查看帮助
./claude.sh --help
```

## 🔧 支持的模型

| 模型名 | 实际模型 | Base URL | 环境变量 |
|--------|----------|----------|----------|
| `kimi` | `kimi-for-coding` | `https://api.kimi.com/coding/` | `KIMI_API_KEY` |
| `minimax` | `MiniMax-M2.5` | `https://api.minimaxi.com/anthropic` | `MINIMAX_API_KEY` |
| `glm5` | `GLM-5` | `https://api.z.ai/api/anthropic` | `Z_AI_API_KEY` |

## 📝 使用方法

### 后台运行任务（默认使用 Kimi）

```bash
./claude.sh -p "检查代码中的bug"
```

或明确指定模型：
```bash
./claude.sh -m kimi -p "检查代码中的bug"
./claude.sh -m glm5 -p "优化性能"
./claude.sh -m minimax -p "重构代码"
```

### 指定会话名称

```bash
./claude.sh -m glm5 -p "优化性能" -s task-001
```

### 读取日志

```bash
# 读取最新日志
./claude.sh -l

# 读取指定会话
./claude.sh -l -s task-001
```

### 附加到运行中的会话

```bash
tmux attach -t claude-task-001
```

### 交互模式（不进入 tmux）

```bash
./claude.sh -m kimi -i
```

### 前台运行（不进入 tmux）

```bash
./claude.sh -n -m glm5 -p "快速任务"
```

## 🔍 常用命令

| 命令 | 说明 |
|------|------|
| `tmux list-sessions` | 查看所有会话 |
| `tmux attach -t <name>` | 附加到会话 |
| `tmux detach` | 分离会话（Ctrl+B 然后 D） |
| `tmux kill-session -t <name>` | 结束会话 |
| `tail -f /tmp/tmux-logs/claude-*.log` | 实时查看日志 |

## ⚠️ 常见问题

### 1. 环境变量未设置

**错误信息:**
```
错误: 使用 kimi 模型需要设置 KIMI_API_KEY 环境变量

配置步骤:
  1. 访问 https://platform.moonshot.cn/ 获取 API Key
  2. 运行: export KIMI_API_KEY="your-api-key"
```

**解决:** 设置对应的环境变量：
```bash
export KIMI_API_KEY="your-actual-api-key"
```

### 2. Claude Code 未安装

**错误信息:**
```
错误: Claude Code 未安装
```

**解决:** 运行安装命令：
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### 3. tmux 未安装

**错误信息:**
```
错误: tmux 未安装
```

**解决:** 根据你的系统安装 tmux（见初始化步骤 2）。

### 4. 会话已存在

**错误信息:**
```
session exists: claude-task-001
```

**解决:** 使用不同的会话名称，或先结束现有会话：
```bash
tmux kill-session -t claude-task-001
```

## 🔧 高级配置

### 自定义工作目录

默认使用当前目录，可通过环境变量设置：

```bash
export CLAUDE_WORKSPACE="/path/to/your/workspace"
```

或在脚本中修改 `WORKDIR` 变量。

### 自定义日志目录

```bash
export CLAUDE_LOG_DIR="/path/to/your/logs"
```

或在脚本中修改 `LOG_DIR` 变量。

### 自定义 tmux 中的 HOME 目录

```bash
export CLAUDE_TMUX_HOME="/home/youruser"
```

### Claude Code 路径检测

脚本会自动检测 Claude Code 路径（通过 `command -v claude`），只要 Claude Code 在 PATH 中即可正常使用。

如果安装后不在 PATH 中，可以手动添加：
```bash
export PATH="$HOME/.local/bin:$PATH"
```

## ➕ 添加新模型

如需添加新的模型供应商，编辑 `claude.sh`，在 `case $MODEL in` 区域添加新的模型配置：

```bash
# 示例：添加新的模型
mynewmodel)
    if [[ -z "${MYNEWMODEL_API_KEY}" ]]; then
        echo "错误: 使用 mynewmodel 需要设置 MYNEWMODEL_API_KEY"
        exit 1
    fi
    export ANTHROPIC_AUTH_TOKEN="${MYNEWMODEL_API_KEY}"
    export ANTHROPIC_BASE_URL="https://api.example.com/anthropic"
    export ANTHROPIC_MODEL="model-name"
    export ANTHROPIC_SMALL_FAST_MODEL="model-name"
    export ANTHROPIC_DEFAULT_SONNET_MODEL="model-name"
    export ANTHROPIC_DEFAULT_HAIKU_MODEL="model-name"
    export ANTHROPIC_DEFAULT_OPUS_MODEL="model-name"
    echo "[模型] MyNewModel"
    ;;
```

## 🐳 Docker 环境配置

Dockerfile 示例：

```dockerfile
# 安装 tmux
RUN apt-get update && apt-get install -y tmux

# 安装 Claude Code
RUN curl -fsSL https://claude.ai/install.sh | bash

# 创建非 root 用户（推荐）
RUN useradd -m -u 1001 claude
USER claude

# 设置环境
ENV HOME=/home/claude
ENV PATH="/home/claude/.local/bin:${PATH}"

# 设置 API Key（通过运行时传入）
ENV KIMI_API_KEY=${KIMI_API_KEY}
ENV MINIMAX_API_KEY=${MINIMAX_API_KEY}
ENV Z_AI_API_KEY=${Z_AI_API_KEY}
```

运行时传入 API Key：
```bash
docker run -e KIMI_API_KEY="sk-xxx" your-image
```

## 📚 更多信息

- Claude Code 文档: https://docs.anthropic.com/claude-code/
- tmux 手册: https://man.openbsd.org/OpenBSD-current/man1/tmux.1
- OpenClaw 文档: https://docs.openclaw.ai

---

**提示:** 首次配置完成后，建议先运行一个简单的测试任务，验证一切正常工作。
