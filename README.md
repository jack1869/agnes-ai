# Agnes CLI

基于 Agnes AI API 的命令行工具，支持文本生成、图片生成、视频生成和提示词优化。

集成了三个模型：
- `agnes-2.0-flash` — 文本生成（编码、推理、对话、工具调用）
- `agnes-image-2.1-flash` — 图片生成（文生图、图生图）
- `agnes-video-v2.0` — 视频生成（文生视频、图生视频）

## 安装

```bash
# 克隆项目后安装依赖
npm install

# 全局链接（使用 agnes 命令）
npm link
```

## 配置

设置 API Key（[申请地址](https://platform.agnes-ai.com/settings/apiKeys)）：

```powershell
set AGNES_API_KEY=your_key_here
```

或在命令中临时指定：

```bash
agnes text "你好" --api-key sk-xxx
```

## 项目结构

```
agnes-cli/
├── bin/
│   ├── agnes.js          # CLI 入口
│   └── agnes.cmd         # Windows 批处理包装器
├── src/
│   ├── api.js            # Agnes API 客户端（chat / image / video）
│   ├── interactive.js    # 交互式 Shell（REPL）
│   ├── utils.js          # 工具函数
│   └── commands/
│       ├── text.js       # 文本生成（agnes-2.0-flash）
│       ├── image.js      # 图片生成（agnes-image-2.1-flash）
│       ├── video.js      # 视频生成（agnes-video-v2.0，异步轮询）
│       └── optimize.js   # 提示词优化
├── package.json
└── README.md
```

## 使用方式

### 交互模式（REPL）

无参数运行进入交互式 Shell，支持多轮对话和斜杠命令：

```bash
agnes
```

```
  ╭──────────────────────────────────────╮
  │  agnes  — Agnes AI Interactive Shell   │
  ╰──────────────────────────────────────╯

  Type /help for commands  ·  /exit to quit

agnes>
```

#### 交互命令

| 命令 | 说明 |
|------|------|
| `<任意文本>` | 直接对话（自动走 text，保持上下文） |
| `/text <消息>` | 显式文本生成 |
| `/image <提示> [选项]` | 图片生成 |
| `/video <提示> [选项]` | 视频生成 |
| `/optimize <提示> [选项]` | 提示词优化 |
| `/system <文本>` | 设置 system prompt |
| `/model <类型> <模型名>` | 切换模型 |
| `/clear` | 清除对话历史 |
| `/history` | 查看对话历史 |
| `/settings` | 查看当前设置 |
| `/help` | 查看帮助 |
| `/exit` | 退出 |

#### 交互示例

```
agnes> 用简单的话解释量子计算

  ── you ──
  用简单的话解释量子计算

  ── agnes ──
  ✦ Thinking...
  量子计算是一种利用量子力学规律进行信息处理的新型计算方式...

agnes> /image 一只穿着宇航服的猫在火星上 --size 1024x768

  ── image ── 1024x768
  一只穿着宇航服的猫在火星上
  ✦ Painting...

  ── result ──
  https://apihub.agnes-ai.com/images/xxx.png

agnes> /optimize 一只奔跑的狗 --for image

  ── optimize ── for image
  一只奔跑的狗
  ✦ Polishing...

  ── refined ──
  A dynamic mid-action shot of a dog running at full speed across an open field...

agnes> /video 无人机在日落时飞过未来城市

  ── video ── 1920x1080
  无人机在日落时飞过未来城市
  ✦ Directing...

  ── result ──
  Video ID: video_xxx · Status: completed

agnes> /system 你是一个诗人

  ◆ System prompt updated · conversation cleared

agnes> 写一首关于秋天的诗

  ── you ──
  写一首关于秋天的诗

  ── agnes ──
  秋风起，黄叶落，满城尽带黄金甲...

agnes> /history
  [1]
    you: 写一首关于秋天的诗
    ai:  秋风起，黄叶落，满城尽带黄金甲...

agnes> /clear

  ◆ Conversation cleared.

agnes> /settings
  system   (none)
  text     agnes-2.0-flash
  image   agnes-image-2.1-flash
  video   agnes-video-v2.0
  history 0 turns

agnes> /exit

Goodbye.
```

### 单命令模式

直接在命令行中执行一次性任务：

```bash
agnes <command> [options] <prompt>
```

#### 文本生成

```bash
# 基础用法
agnes text "用简单的话解释量子计算"

# 带 system prompt 和 temperature
agnes text --system "你是一个诗人" --temperature 0.8 "写一首关于AI的诗"

# 流式输出
agnes text --stream "讲一个笑话"

# 指定模型
agnes text --model agnes-2.0-flash "你好"

# JSON 格式输出
agnes text "你好" --json
```

#### 图片生成

```bash
# 文生图
agnes image "一只穿着宇航服的猫在火星上"

# 指定尺寸
agnes image "赛博朋克城市夜景" --size 1024x768

# 指定模型
agnes image "水墨风格山水画" --model agnes-image-2.1-flash
```

#### 视频生成

```bash
# 文生视频（自动轮询直到完成）
agnes video "无人机在日落时飞过未来城市"

# 指定参数
agnes video "电影级爆炸场景" --width 1920 --height 1080 --frames 81 --fps 30

# 使用 negative prompt
agnes video "宁静的湖面" --neg "波浪, 大风, 船只"

# 不等待，立即返回 video_id
agnes video "快速预览" --no-wait

# 指定随机种子复现结果
agnes video "城市夜景" --seed 42
```

#### 提示词优化

```bash
# 优化为图片提示词
agnes optimize "一只奔跑的狗" --for image

# 优化为视频提示词
agnes optimize "无人机航拍" --for video

# 优化为文本提示词（默认）
agnes optimize "解释气候变化"
```

## 选项参考

### 全局选项

| 选项 | 说明 |
|------|------|
| `--api-key <key>` | 指定 API Key（也可用环境变量 `AGNES_API_KEY`） |
| `--json` | JSON 格式输出 |
| `--interactive` | 强制进入交互模式 |

### 文本选项

| 选项 | 说明 |
|------|------|
| `--system <text>` | 系统提示词 |
| `--temperature <n>` | 采样温度（0-2） |
| `--max-tokens <n>` | 最大生成 Token 数 |
| `--model <name>` | 模型名（默认 agnes-2.0-flash） |
| `--stream` | 流式输出 |

### 图片选项

| 选项 | 说明 |
|------|------|
| `--size <WxH>` | 图片尺寸，如 1024x768（默认 1024x1024） |
| `--model <name>` | 模型名（默认 agnes-image-2.1-flash） |

### 视频选项

| 选项 | 说明 |
|------|------|
| `--width <px>` | 视频宽度（默认 1920） |
| `--height <px>` | 视频高度（默认 1080） |
| `--frames <n>` | 帧数（8n+1，最大 441） |
| `--fps <n>` | 帧率（1-60，默认 60） |
| `--neg <text>` | 避免生成的内容 |
| `--seed <n>` | 随机种子 |
| `--no-wait` | 不等待直接返回 |
| `--model <name>` | 模型名（默认 agnes-video-v2.0） |

### 优化选项

| 选项 | 说明 |
|------|------|
| `--for <type>` | 目标类型：text / image / video（默认 text） |

## 交互式 Shell 设计

### 设计理念

交互式 Shell 的设计参考了 OpenCode TUI 的终端原生风格，遵循以下原则：

- **终端原生** — 纯 ANSI Escape Code 渲染，不依赖任何 TUI 框架
- **暗色画布** — 近黑底色，文字对比清晰，适合长时间使用
- **绿色主色调** — 借鉴经典 phosphor green（`#50fa7b`），仅用于提示符、边框和操作反馈
- **极简边框** — 仅用 1px 线框，无阴影、无渐变、无圆角模糊
- **信息层级** — `<label> <value>` 结构，一目了然

### 色彩方案

| Token | 颜色 | 用途 |
|-------|------|------|
| `#50fa7b` | 磷光绿 | 边框、提示符、成功反馈 ◆ |
| `#d2d2d2` | 暖白 | 主文本、命令名称 |
| `dim` | 暗灰 | 说明文字、标签、状态 |
| `#8be9fd` | 青色 | 生成的 URL、可点击结果 |
| `#ff5555` | 红色 | 错误 ✗ |
| `#f1fa8c` | 黄色 | 警告 ⚠ |

### 界面结构

```
  ╭──────────────────────────────────────╮    ← 绿色边框
  │  agnes  — Agnes AI Interactive Shell   │    ← 粗体标题 + 灰色副标题
  ╰──────────────────────────────────────╯
                                           ← 空行
  Type /help for commands  ·  /exit to quit  ← 引导文字
                                           ← 空行
agn es>                                     ← 绿色(agn) + 灰色(es>) 分割提示符
```

### 对话样式

每条消息用分隔线标明角色，用户和 AI 的对话清晰区分：

```
  ── you ──                                  ← 灰色标签
  <用户输入内容>

  ── agnes ──                                ← 绿色标签
  <AI 回复内容>
```

### 命令反馈约定

| 反馈 | 符号 | 颜色 |
|------|------|------|
| 操作成功 | `◆` | 绿色 |
| 操作失败 | `✗` + 错误信息 | 红色 |
| 参数错误 | `⚠` + 使用提示 | 黄色 |
| 生成中 | `generating...` / `creating...` / `refining...` | 灰色，覆写为进度 |
| 结果 | `── result ──` / `── refined ──` | 绿色标签，URL 青色 |

### 对话上下文

交互模式下，所有直接输入的文本和 `/text` 命令会累积对话历史，模型能记住前文。`/clear` 清除历史重新开始，`/system` 设置 system prompt 时也会自动清除历史。
