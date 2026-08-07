# Agnes CLI

基于 Agnes AI API 的命令行工具，支持文本生成、图片生成、视频生成和提示词优化。

集成了三个模型：
- `agnes-2.5-flash` — 文本生成（编码、推理、对话、工具调用，默认；`agnes-2.0-flash` 仍兼容，可通过 `--model` 指定）
- `agnes-image-2.1-flash` — 图片生成（文生图、图生图、多图合成）
- `agnes-video-v2.0` — 视频生成（文生视频、图生视频、关键帧动画）

## 安装

```bash
# 克隆项目后安装依赖
npm install

# 全局链接（使用 agnes 命令）
npm link
```

## 配置

设置 API Key（[申请地址](https://platform.agnes-ai.com/apiKeys)）：

```powershell
set AGNES_API_KEY=your_key_here
```

或在项目根目录创建 `.env` 文件（推荐，自动加载）：

```
AGNES_API_KEY=your_key_here
```

或在命令中临时指定：

```bash
agnes text "你好" --api-key sk-xxx
```

交互模式下如果没有设置 Key，启动时会提示输入。

## 项目结构

```
agnes-cli/
├── bin/
│   ├── agnes.js          # CLI 入口
│   └── agnes.cmd         # Windows 批处理包装器
├── src/
│   ├── api.js            # Agnes API 客户端（chat / image / video）
│   ├── utils.js          # 工具函数（下载保存 / 校验 / .env 加载）
│   ├── interactive.js    # 交互式 Shell（REPL）入口
│   ├── cli/
│   │   └── args.js       # 命令行参数解析（help / version）
│   ├── commands/
│   │   ├── text.js       # 文本生成（agnes-2.5-flash）
│   │   ├── image.js      # 图片生成（agnes-image-2.1-flash，支持保存）
│   │   ├── video.js      # 视频生成（agnes-video-v2.0，异步轮询，支持保存）
│   │   └── optimize.js   # 提示词优化
│   └── repl/
│       ├── banner.js     # 启动 Banner / 帮助文本
│       ├── handlers.js   # 交互命令处理
│       └── multiline.js  # 多行输入编辑器
├── test/
│   ├── utils.test.js
│   └── args.test.js
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
| `/image <提示> [选项]` | 图片生成（不带提示 → 多行编辑器） |
| `/video <提示> [选项]` | 视频生成（不带提示 → 多行编辑器） |
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
  https://api.agnes-ai.cn/images/xxx.png

agnes> /optimize 一只奔跑的狗 --for image

  ── optimize ── for image
  一只奔跑的狗
  ✦ Polishing...

  ── refined ──
  A dynamic mid-action shot of a dog running at full speed across an open field...

agnes> /video 无人机在日落时飞过未来城市

  ── video ── 1152x768
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
  text     agnes-2.5-flash
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

# 指定模型（默认 agnes-2.5-flash，兼容 agnes-2.0-flash）
agnes text --model agnes-2.0-flash "你好"
agnes text --model agnes-2.5-flash "你好"

# JSON 格式输出
agnes text "你好" --json
```

#### 图片生成

```bash
# 文生图
agnes image "一只穿着宇航服的猫在火星上"

# 指定尺寸（支持 WxH 像素或 1K/2K/3K/4K 档位 + 宽高比）
agnes image "赛博朋克城市夜景" --size 2K --ratio 16:9

# 图生图（单图）
agnes image "改成赛博朋克风格" -i input.jpg

# 多图合成
agnes image "把这两张图合在一起" -i a.png --image-url https://x/b.png

# 返回 base64 数据
agnes image "一只猫" --return-base64

# 指定模型
agnes image "水墨风格山水画" --model agnes-image-2.1-flash

# 保存到本地文件
agnes image "一只猫" --output cat.png
```

#### 视频生成

```bash
# 文生视频（自动轮询直到完成）
agnes video "无人机在日落时飞过未来城市"

# 指定参数（默认 1152x768 @24fps，121 帧 ≈ 5 秒）
agnes video "电影级爆炸场景" --width 1920 --height 1080 --frames 81 --fps 30

# 图生视频
agnes video "像这样动起来" -i style.png

# 关键帧动画
agnes video "沿着关键帧生成动画" -k k1.png -k k2.png -k k3.png

# 使用 negative prompt
agnes video "宁静的湖面" --neg "波浪, 大风, 船只"

# 不等待，立即返回 video_id
agnes video "快速预览" --no-wait

# 指定随机种子复现结果
agnes video "城市夜景" --seed 42

# 指定运动强度并保存到本地文件
agnes video "镜头推进" --motion 3 --output clip.mp4
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
| `--api-key <key>` | 指定 API Key（也可用环境变量 `AGNES_API_KEY` 或 `.env`） |
| `--json` | JSON 格式输出 |
| `--interactive` | 强制进入交互模式 |
| `-v, --version` | 显示版本 |
| `-h, --help` | 显示帮助 |

### 文本选项

| 选项 | 说明 |
|------|------|
| `--system <text>` | 系统提示词 |
| `--temperature <n>` | 采样温度（0-2） |
| `--top-p <n>` | Top-p 核采样（0-1） |
| `--thinking` | 开启 Thinking 模式（agnes-2.5-flash） |
| `--max-tokens <n>` | 最大生成 Token 数 |
| `--model <name>` | 模型名（默认 agnes-2.5-flash；兼容 agnes-2.0-flash） |
| `--stream` | 流式输出 |
| `-i, --image-file <path>` | 本地参考图片（图像理解） |
| `--image-url <url>` | 参考图片 URL（图像理解） |

### 图片选项

| 选项 | 说明 |
|------|------|
| `--size <WxH\|1K\|2K\|3K\|4K>` | 图片尺寸：像素 WxH 或档位（默认 1K） |
| `--ratio <R>` | 宽高比：1:1 / 3:4 / 4:3 / 16:9 / 9:16 / 2:3 / 3:2 / 21:9 |
| `--return-base64` | 返回 base64 图片数据而非 URL |
| `--model <name>` | 模型名（默认 agnes-image-2.1-flash） |
| `--output <path>` | 将生成的图片保存到本地文件 |
| `-i, --image-file <path>` | 参考图片（图生图 / 多图合成） |
| `--image-url <url>` | 参考图片 URL（图生图 / 多图合成） |

### 视频选项

| 选项 | 说明 |
|------|------|
| `--width <px>` | 视频宽度（默认 1152） |
| `--height <px>` | 视频高度（默认 768） |
| `--frames <n>` | 帧数（8n+1，最大 441，默认 121 ≈ 5 秒） |
| `--fps <n>` | 帧率（1-60，默认 24） |
| `--neg <text>` | 避免生成的内容 |
| `--seed <n>` | 随机种子 |
| `--motion <n>` | 运动强度（0-10） |
| `--mode <mode>` | 生成模式（ti2vid / keyframes） |
| `--steps <n>` | 推理步数 |
| `--output <path>` | 将生成的视频保存到本地文件 |
| `--no-wait` | 不等待直接返回 |
| `--model <name>` | 模型名（默认 agnes-video-v2.0） |
| `-i, --image-file <path>` | 参考图片（图生视频） |
| `--image-url <url>` | 参考图片 URL（图生视频） |
| `-k, --keyframe <path\|url>` | 关键帧图片（可重复指定） |
| `-f, --video-file <path>` | 参考视频（视频转视频） |

### 优化选项

| 选项 | 说明 |
|------|------|
| `--for <type>` | 目标类型：text / image / video（默认 text） |

## 测试

```bash
npm test
```

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

### 图片 / 视频生成细节

- `/image` 和 `/video` 默认会先用优化器打磨提示词（额外一次文本调用）；追加 `--no-opt` 可跳过。
- `/image` 或 `/video` 不带提示词时，会自动打开多行编辑器（标题显示 "Compose Image/Video Prompt"），适合长文本、换行书写；编辑器内的换行会在提交时合并为空格。
- 交互模式下生成的图片和视频会自动保存到 `~/agnes-outputs/images/`、`~/agnes-outputs/videos/`，并显示本地路径。
- 使用 `--output <path>` 可指定保存位置（单命令模式同样支持）。
- 输入历史（上下方向键）会持久化在 `~/.agnes/repl_history.json`，下次启动可继续回看。
