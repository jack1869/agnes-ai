import readline from 'node:readline';
import { createRequire } from 'node:module';
import { textCommand } from './commands/text.js';
import { imageCommand } from './commands/image.js';
import { videoCommand, videoStatus, listVideoTasks } from './commands/video.js';
import { optimizeCommand } from './commands/optimize.js';
import { formatOutput, sleep } from './utils.js';
import chalk from 'chalk';
import ora from 'ora';
import stringWidth from 'string-width';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const logoLines = [
  "    █████╗   ██████╗  ███╗   ██╗ ███████╗ ███████╗",
  "   ██╔══██╗ ██╔════╝ ████╗  ██║ ██╔════╝ ██╔════╝",
  "   ███████║ ██║  ███╗ ██╔██╗ ██║ █████╗   ███████╗",
  "   ██╔══██║ ██║   ██║ ██║╚██╗██║ ██╔══╝   ╚════██║",
  "   ██║  ██║ ╚██████╔╝ ██║ ╚████║ ███████╗ ███████║",
  "   ╚═╝  ╚═╝  ╚═════╝  ╚═╝  ╚═══╝ ╚══════╝ ╚══════╝",
];

const logoColors = [
  '#00d4ff', '#00b8ff', '#0099ff', '#0077ff',
  '#6633ff', '#aa22ff',
];

function buildBanner() {
  const infoLines = [
    ("  ◆  AI Interactive Shell  ●  v" + version),
    ("  ◆  Model: agnes-2.0-flash"),
  ];
  const infoColors = ['#dd66ff', '#ee66ff'];

  const allLines = [...logoLines, ...infoLines];
  const maxLen = Math.max(...allLines.map(l => l.length));

  const top = chalk.hex('#00d4ff')(' ╭' + '─'.repeat(maxLen + 4) + '╮');
  const bottom = chalk.hex('#00d4ff')(' ╰' + '─'.repeat(maxLen + 4) + '╯');

  const gap = ' │  ' + chalk.hex('#00d4ff')(''.padEnd(maxLen)) + '  │';

  const logoPart = logoLines.map((line, i) =>
    ' │  ' + chalk.hex(logoColors[i])(line.padEnd(maxLen)) + '  │'
  ).join('\n');

  const infoPart = infoLines.map((line, i) =>
    ' │  ' + chalk.hex(infoColors[i])(line.padEnd(maxLen)) + '  │'
  ).join('\n');

  return [top, gap, logoPart, gap, infoPart, bottom].join('\n');
}

const FOOTER = chalk.hex('#8855ff')('  Type /help for commands') + chalk.dim('  ·  ') + chalk.hex('#8855ff')('/exit to quit');

const HELP_TEXT = `
${chalk.hex('#50fa7b').bold(' ── Commands ──')}
  ${chalk.hex('#d2d2d2')('<text>')}              ${chalk.dim('Send a message (text, keeps context)')}
  ${chalk.hex('#d2d2d2')('/text <msg>')}         ${chalk.dim('Text generation')}
  ${chalk.hex('#d2d2d2')('/input')}               ${chalk.dim('Multi-line input (Ctrl+D=submit, Ctrl+C=cancel)')}
  ${chalk.hex('#d2d2d2')('/image <prompt>')}     ${chalk.dim('Generate image  [--size WxH] [--image-file/-i P]')}
  ${chalk.hex('#d2d2d2')('/video <prompt>')}     ${chalk.dim('Generate video  [--width W] [--height H]')}
  ${chalk.dim('                     [--frames N] [--fps N] [--neg T] [--no-wait]')}
  ${chalk.dim('                     [--image-file/-i P] [--video-file/-f P]')}
  ${chalk.hex('#d2d2d2')('/optimize <prompt>')}  ${chalk.dim('Optimize prompt [--for text|image|video]')}
  ${chalk.hex('#d2d2d2')('/system <text>')}      ${chalk.dim('Set system prompt')}
  ${chalk.hex('#d2d2d2')('/model <t> <m>')}      ${chalk.dim('Switch model (text|image|video)')}
  ${chalk.hex('#d2d2d2')('/clear')}              ${chalk.dim('Clear conversation')}
  ${chalk.hex('#d2d2d2')('/history')}            ${chalk.dim('Show conversation log')}
  ${chalk.hex('#d2d2d2')('/video-status <id>')}   ${chalk.dim('Check video generation status')}
  ${chalk.hex('#d2d2d2')('/video-list')}          ${chalk.dim('Show recent video tasks')}
  ${chalk.hex('#d2d2d2')('/settings')}           ${chalk.dim('Show current config')}
  ${chalk.hex('#d2d2d2')('/help')}               ${chalk.dim('Show this help')}
  ${chalk.hex('#d2d2d2')('/exit')}               ${chalk.dim('Exit')}

${chalk.hex('#50fa7b').bold(' ── Default Models ──')}
  ${chalk.dim('text :')}  agnes-2.0-flash
  ${chalk.dim('image:')}  agnes-image-2.1-flash
  ${chalk.dim('video:')}  agnes-video-v2.0
`;

function box(text) {
  const width = text.length + 4;
  const line = chalk.hex('#50fa7b').dim('\u2500');
  const top = chalk.hex('#50fa7b').dim('\u250C') + line.repeat(width) + chalk.hex('#50fa7b').dim('\u2510');
  const mid = chalk.hex('#50fa7b').dim('\u2502 ') + text + chalk.hex('#50fa7b').dim(' \u2502');
  const bot = chalk.hex('#50fa7b').dim('\u2514') + line.repeat(width) + chalk.hex('#50fa7b').dim('\u2518');
  return `\n${top}\n${mid}\n${bot}\n`;
}

export async function startInteractive() {
  const spin = ora({ text: 'Initializing Agnes AI...', color: 'cyan' }).start();
  await sleep(500);
  spin.stop();

  process.stdout.write('\n');
  console.log(buildBanner());
  console.log(FOOTER);
  process.stdout.write('\n');

  const state = {
    messages: [],
    settings: {
      system: '',
      model: 'agnes-2.0-flash',
      imageModel: 'agnes-image-2.1-flash',
      videoModel: 'agnes-video-v2.0',
      temperature: undefined,
      maxTokens: undefined,
    },
    history: [],
  };

  let rlClosing = false;

  function makeRl() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.hex('#50fa7b')('agnes> '),
      terminal: true,
    });

    const lineHandler = async (raw) => {
      const trimmed = raw.trim();

      if (trimmed === '/input' || trimmed === '/compose') {
        rlClosing = true;
        rl.close();
        rlClosing = false;
        const answer = await multilineEditor();
        const newRl = makeRl();
        console.log('');
        if (answer.trim()) {
          console.log(chalk.hex('#50fa7b')('  ── composed ──') + '\n');
          await handleLine(newRl, state, answer.trim());
        } else {
          console.log(chalk.dim('  (cancelled)\n'));
        }
        newRl.prompt();
        return;
      }

      if (!trimmed) {
        rl.prompt();
        return;
      }

      await handleLine(rl, state, trimmed);
      rl.prompt();
    };

    rl.on('line', lineHandler);

    rl.on('close', () => {
      if (!rlClosing) {
        process.stdout.write('\n');
        console.log(chalk.dim('Goodbye.'));
        process.exit(0);
      }
    });

    rl.prompt();
    return rl;
  }

  makeRl();

  process.on('SIGINT', () => {
    process.stdout.write('\n');
    console.log(chalk.dim('Goodbye.'));
    process.exit(0);
  });

  return new Promise(() => {});
}

function multilineEditor() {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const editor = { lines: [''], row: 0, col: 0 };
    let cancelled = false;

    const origSigint = process.listeners('SIGINT').pop();
    process.removeAllListeners('SIGINT');
    process.on('SIGINT', () => {});

    stdin.setRawMode(true);
    stdin.resume();

    const tw = stdout.columns || 80;
    const cw = Math.max(30, tw - 7);
    const bar = '─'.repeat(cw + 2);
    const top = chalk.hex('#00d4ff')(' ╭' + bar + '╮');
    const title = chalk.hex('#00c4ff')(' │ ') + chalk.bold('◆  Compose Message'.padEnd(cw)) + chalk.hex('#00c4ff')(' │');
    const hint = chalk.hex('#00b8ff')(' │ ') + chalk.dim('Ctrl+D=submit  Ctrl+C=cancel  Enter=newline'.padEnd(cw)) + chalk.hex('#00b8ff')(' │');
    const sep = chalk.hex('#00d4ff')(' ├' + bar + '┤');
    const bot = ' ╰' + bar + '╯';

    const headerRows = 4;
    let prevLineCount = 0;
    let prevLineOffset = 0;

    function buildLines() {
      const lines = [top, title, hint, sep];
      const visibleStart = Math.max(0, editor.row - (stdout.rows || 24) + headerRows);
      for (let i = visibleStart; i < editor.lines.length; i++) {
        const line = editor.lines[i];
        let display = '';
        let w = 0;
        for (const ch of line) {
          const wch = stringWidth(ch);
          if (w + wch > cw) { display += '…'; w += 2; break; }
          w += wch;
          display += ch;
        }
        const padded = display + ' '.repeat(Math.max(0, cw - w));
        lines.push(chalk.hex('#00b8ff')(' │ ') + padded + chalk.hex('#00b8ff')(' │'));
      }
      lines.push(chalk.hex('#00d4ff')(bot));
      return lines;
    }

    function refresh() {
      const lines = buildLines();
      const visibleStart = Math.max(0, editor.row - (stdout.rows || 24) + headerRows);
      const lineOffset = headerRows + (editor.row - visibleStart);

      if (prevLineCount > 0) {
        stdout.write(`\x1b[${prevLineOffset}A\r`);
      }
      stdout.write('\x1b[J' + lines.join('\n'));
      prevLineCount = lines.length;
      prevLineOffset = lineOffset;

      const col = 3 + Math.min(stringWidth(editor.lines[editor.row].slice(0, editor.col)), cw);
      stdout.write(`\x1b[${lines.length - lineOffset - 1}A\x1b[${col}G`);
    }

    function cleanup() {
      stdin.setRawMode(false);
      stdin.removeListener('data', dataHandler);
      stdout.write(`\x1b[${prevLineOffset}A\r\x1b[J\x1b[?25h`);
      process.removeAllListeners('SIGINT');
      if (origSigint) process.on('SIGINT', origSigint);
      resolve(cancelled ? '' : editor.lines.join('\n'));
    }

    function enter() {
      const line = editor.lines[editor.row];
      const rest = line.slice(editor.col);
      editor.lines[editor.row] = line.slice(0, editor.col);
      editor.lines.splice(editor.row + 1, 0, rest);
      editor.row++;
      editor.col = 0;
    }

    function backspace() {
      if (editor.col > 0) {
        const line = editor.lines[editor.row];
        editor.lines[editor.row] = line.slice(0, editor.col - 1) + line.slice(editor.col);
        editor.col--;
      } else if (editor.row > 0) {
        editor.col = editor.lines[editor.row - 1].length;
        editor.lines[editor.row - 1] += editor.lines[editor.row];
        editor.lines.splice(editor.row, 1);
        editor.row--;
      }
    }

    function cursorUp() {
      if (editor.row > 0) { editor.row--; editor.col = Math.min(editor.col, editor.lines[editor.row].length); }
    }
    function cursorDown() {
      if (editor.row < editor.lines.length - 1) { editor.row++; editor.col = Math.min(editor.col, editor.lines[editor.row].length); }
    }
    function cursorLeft() {
      if (editor.col > 0) editor.col--;
      else if (editor.row > 0) { editor.row--; editor.col = editor.lines[editor.row].length; }
    }
    function cursorRight() {
      if (editor.col < editor.lines[editor.row].length) editor.col++;
      else if (editor.row < editor.lines.length - 1) { editor.row++; editor.col = 0; }
    }
    function deleteCharAt() {
      const line = editor.lines[editor.row];
      if (editor.col < line.length) {
        editor.lines[editor.row] = line.slice(0, editor.col) + line.slice(editor.col + 1);
      } else if (editor.row < editor.lines.length - 1) {
        editor.lines[editor.row] += editor.lines[editor.row + 1];
        editor.lines.splice(editor.row + 1, 1);
      }
    }

    const dataHandler = (buf) => {
      const str = buf.toString();
      let i = 0;
      while (i < str.length) {
        const ch = str[i];

        if (ch === '\x1b') {
          const rest = str.slice(i);
          if (rest.startsWith('\x1b[D')) { cursorLeft(); i += 2; }
          else if (rest.startsWith('\x1b[C')) { cursorRight(); i += 2; }
          else if (rest.startsWith('\x1b[A')) { cursorUp(); i += 2; }
          else if (rest.startsWith('\x1b[B')) { cursorDown(); i += 2; }
          else if (rest.startsWith('\x1b[H')) { editor.col = 0; i += 2; }
          else if (rest.startsWith('\x1b[F')) { editor.col = editor.lines[editor.row].length; i += 2; }
          else if (rest.startsWith('\x1b[3~')) { deleteCharAt(); i += 3; }
          else if (rest.startsWith('\x1b[200~')) {
            const end = str.indexOf('\x1b[201~', i);
            if (end > i) {
              const paste = str.slice(i + 6, end);
              for (const pc of paste) {
                if (pc === '\r' || pc === '\n') enter();
                else {
                  const line = editor.lines[editor.row];
                  editor.lines[editor.row] = line.slice(0, editor.col) + pc + line.slice(editor.col);
                  editor.col++;
                }
              }
              i = end + 5;
            }
          }
          i++;
          refresh();
          continue;
        }

        if (ch === '\r' || ch === '\n') { enter(); i++; refresh(); continue; }
        if (ch === '\x7f' || ch === '\b') { backspace(); i++; refresh(); continue; }

        if (ch === '\x04') { cleanup(); return; }
        if (ch === '\x03') { cancelled = true; cleanup(); return; }

        const line = editor.lines[editor.row];
        editor.lines[editor.row] = line.slice(0, editor.col) + ch + line.slice(editor.col);
        editor.col++;
        i++;
        refresh();
      }
    };

    stdin.on('data', dataHandler);
    stdout.write('\x1b[?25l');
    refresh();
  });
}

function formatTimeAgo(timestamp, now) {
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function handleLine(rl, state, line) {
  if (line.startsWith('/')) {
    await handleCommand(rl, state, line);
    return;
  }

  await handleText(rl, state, line);
}

async function handleCommand(rl, state, line) {
  const parts = line.split(' ');
  const cmd = parts[0].toLowerCase();
  const rest = parts.slice(1).join(' ');

  switch (cmd) {
    case '/exit':
    case '/quit':
      process.stdout.write('\n');
      console.log(chalk.dim('Goodbye.'));
      rl.close();
      process.exit(0);
      break;

    case '/help':
      console.log(HELP_TEXT);
      break;

    case '/clear':
      state.messages = [];
      state.history = [];
      process.stdout.write('\n');
      console.log(chalk.hex('#50fa7b')('  ◆') + ' ' + chalk.dim('Conversation cleared.'));
      process.stdout.write('\n');
      break;

    case '/history':
      if (state.history.length === 0) {
        process.stdout.write('\n');
        console.log(chalk.dim('  (no conversation history)'));
        process.stdout.write('\n');
        break;
      }
      process.stdout.write('\n');
      state.history.forEach((entry, i) => {
        const label = chalk.hex('#50fa7b')(`  [${i + 1}]`);
        const you = chalk.dim('you: ') + entry.user.slice(0, 72) + (entry.user.length > 72 ? chalk.dim('…') : '');
        const ai = chalk.dim('ai:  ') + entry.assistant.slice(0, 72) + (entry.assistant.length > 72 ? chalk.dim('…') : '');
        console.log(label);
        console.log(`  ${you}`);
        console.log(`  ${ai}`);
        if (i < state.history.length - 1) process.stdout.write('\n');
      });
      process.stdout.write('\n');
      break;

    case '/system':
      if (!rest) {
        process.stdout.write('\n');
        if (state.settings.system) {
          console.log(chalk.dim('  system: ') + state.settings.system);
        } else {
          console.log(chalk.dim('  (no system prompt set)'));
        }
        process.stdout.write('\n');
      } else {
        state.settings.system = rest;
        state.messages = [];
        process.stdout.write('\n');
        console.log(chalk.hex('#50fa7b')('  ◆') + ' ' + chalk.dim('System prompt updated · conversation cleared'));
        process.stdout.write('\n');
      }
      break;

    case '/model':
      if (!rest) {
        process.stdout.write('\n');
        console.log(`  ${chalk.dim('text :')}  ${chalk.hex('#d2d2d2')(state.settings.model)}`);
        console.log(`  ${chalk.dim('image:')}  ${chalk.hex('#d2d2d2')(state.settings.imageModel)}`);
        console.log(`  ${chalk.dim('video:')}  ${chalk.hex('#d2d2d2')(state.settings.videoModel)}`);
        process.stdout.write('\n');
        break;
      }
      {
        const target = parts[1];
        const model = parts.slice(2).join(' ');
        if (target === 'text' && model) {
          state.settings.model = model;
          process.stdout.write('\n');
          console.log(chalk.hex('#50fa7b')('  ◆') + ` ${chalk.dim('Text model →')} ${model}`);
        } else if (target === 'image' && model) {
          state.settings.imageModel = model;
          process.stdout.write('\n');
          console.log(chalk.hex('#50fa7b')('  ◆') + ` ${chalk.dim('Image model →')} ${model}`);
        } else if (target === 'video' && model) {
          state.settings.videoModel = model;
          process.stdout.write('\n');
          console.log(chalk.hex('#50fa7b')('  ◆') + ` ${chalk.dim('Video model →')} ${model}`);
        } else {
          process.stdout.write('\n');
          console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /model <text|image|video> <model_name>'));
        }
        process.stdout.write('\n');
      }
      break;

    case '/settings':
      process.stdout.write('\n');
      console.log(`  ${chalk.dim('system')}   ${chalk.hex('#d2d2d2')(state.settings.system || '(none)')}`);
      console.log(`  ${chalk.dim('text')}     ${chalk.hex('#d2d2d2')(state.settings.model)}`);
      console.log(`  ${chalk.dim('image')}   ${chalk.hex('#d2d2d2')(state.settings.imageModel)}`);
      console.log(`  ${chalk.dim('video')}   ${chalk.hex('#d2d2d2')(state.settings.videoModel)}`);
      console.log(`  ${chalk.dim('history')} ${chalk.hex('#d2d2d2')(String(state.history.length) + ' turns')}`);
      process.stdout.write('\n');
      break;

    case '/text':
      if (!rest) {
        process.stdout.write('\n');
        console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /text <your message>'));
        process.stdout.write('\n');
        break;
      }
      await handleText(rl, state, rest);
      break;

    case '/image':
      if (!rest) {
        process.stdout.write('\n');
        console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /image <prompt> [--size WxH] [--image-file/-i P]'));
        process.stdout.write('\n');
        break;
      }
      await handleImage(rl, state, rest);
      break;

    case '/video':
      if (!rest) {
        process.stdout.write('\n');
        console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /video <prompt> [options]'));
        process.stdout.write('\n');
        break;
      }
      await handleVideo(rl, state, rest);
      break;

    case '/video-status':
      if (!rest) {
        process.stdout.write('\n');
        console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /video-status <video_id>'));
        process.stdout.write('\n');
        break;
      }
      await handleVideoStatus(rl, state, rest.trim());
      break;

    case '/video-list':
      {
        const tasks = listVideoTasks();
        process.stdout.write('\n');
        if (tasks.length === 0) {
          console.log(chalk.dim('  (no recent video tasks)'));
        } else {
          console.log(chalk.hex('#50fa7b').bold('  ── recent video tasks ──'));
          const now = Date.now();
          tasks.slice(0, 10).forEach((t, i) => {
            const ago = formatTimeAgo(new Date(t.createdAt).getTime(), now);
            console.log(`  ${chalk.hex('#f1fa8c')(t.videoId)}  ${chalk.dim(ago)}`);
            console.log(`  ${chalk.dim(t.prompt.slice(0, 72))}${t.prompt.length > 72 ? chalk.dim('…') : ''}`);
            if (i < Math.min(tasks.length, 10) - 1) process.stdout.write('\n');
          });
        }
        process.stdout.write('\n');
      }
      break;

    case '/optimize':
      if (!rest) {
        process.stdout.write('\n');
        console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /optimize <prompt> [--for text|image|video]'));
        process.stdout.write('\n');
        break;
      }
      await handleOptimize(rl, state, rest);
      break;

    default:
      process.stdout.write('\n');
      console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim(`Unknown command: ${cmd}`) + '\n' + chalk.dim('  Type /help to see available commands'));
      process.stdout.write('\n');
  }
}

async function handleText(rl, state, prompt) {
  const options = {
    ...state.settings,
    model: state.settings.model,
    messages: state.messages,
    stream: true,
  };

  process.stdout.write('\n');
  process.stdout.write(`  ${chalk.dim('✦ Thinking')}${chalk.dim('...')}`);
  rl.pause();

  let cleared = false;
  options.writeFn = (text) => {
    if (!cleared) {
      cleared = true;
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
    }
    process.stdout.write(text);
  };
  options.onFirstChunk = () => {};

  try {
    const result = await textCommand(prompt, options);

    let content;
    if (typeof result === 'string') {
      content = result;
      if (!options.stream) {
        process.stdout.write('\n');
        process.stdout.write(content);
      }
    }

    state.messages.push({ role: 'user', content: prompt });
    state.messages.push({ role: 'assistant', content: content || result });
    state.history.push({ user: prompt, assistant: content || result });

    process.stdout.write('\n');
  } catch (err) {
    process.stdout.write('\n');
    process.stdout.write(chalk.hex('#ff5555')(`  ✗ ${err.message}`));
    process.stdout.write('\n');
  } finally {
    rl.resume();
    rl.prompt();
  }
}

function parseOptions(rest) {
  const parts = rest.split(' ');
  const options = {};
  const promptParts = [];

  for (let i = 0; i < parts.length; i++) {
    switch (parts[i]) {
      case '--size':
        options.size = parts[++i];
        break;
      case '--model':
        options.model = parts[++i];
        break;
      case '--width':
        options.width = parseInt(parts[++i]);
        break;
      case '--height':
        options.height = parseInt(parts[++i]);
        break;
      case '--frames':
      case '--num-frames':
        options.numFrames = parseInt(parts[++i]);
        break;
      case '--fps':
      case '--frame-rate':
        options.frameRate = parseInt(parts[++i]);
        break;
      case '--neg':
      case '--negative-prompt':
        options.negativePrompt = parts[++i];
        break;
      case '--no-wait':
        options.wait = false;
        break;
      case '--for':
        options.for = parts[++i];
        break;
      case '--seed':
        options.seed = parseInt(parts[++i]);
        break;
      case '--image-file':
      case '-i':
        options.imageFile = parts[++i];
        break;
      case '--video-file':
      case '-f':
        options.videoFile = parts[++i];
        break;
      default:
        promptParts.push(parts[i]);
    }
  }

  options.prompt = promptParts.join(' ');
  return options;
}

async function handleImage(rl, state, rest) {
  const opts = parseOptions(rest);
  if (!opts.prompt) {
    process.stdout.write('\n');
    console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Prompt is required'));
    process.stdout.write('\n');
    return;
  }

  const originalPrompt = opts.prompt;
  process.stdout.write('\n');
  process.stdout.write(`  ${chalk.dim('✦ Optimizing prompt')}${chalk.dim('...')}`);
  rl.pause();

  try {
    const optimized = await optimizeCommand(originalPrompt, { for: 'image' });
    opts.prompt = optimized;
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#50fa7b')('  ── optimized ──') + '\n');
    process.stdout.write(`  ${chalk.dim(optimized)}\n\n`);
  } catch {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#f1fa8c')('  ⚠ ') + chalk.dim('Optimization failed, using original prompt\n\n'));
  }

  process.stdout.write(chalk.hex('#50fa7b').bold(`  ── image ── ${opts.size || '1024x1024'}`) + '\n');
  process.stdout.write(`  ${chalk.dim(originalPrompt)}\n\n`);
  const statusMsg = `  ${chalk.dim('✦ Painting')}${chalk.dim('...')}`;
  process.stdout.write(statusMsg);

  try {
    const result = await imageCommand(opts.prompt, {
      model: opts.model || state.settings.imageModel,
      size: opts.size || '1024x1024',
      imageFile: opts.imageFile,
    });

    const output = formatOutput(result);

    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#50fa7b')('  ── result ──') + '\n');
    process.stdout.write(`  ${chalk.hex('#8be9fd')(output)}\n\n`);
  } catch (err) {
    process.stdout.write('\n');
    process.stdout.write(chalk.hex('#ff5555')(`  ✗ ${err.message}\n`));
  } finally {
    rl.resume();
    rl.prompt();
  }
}

async function handleVideo(rl, state, rest) {
  const opts = parseOptions(rest);
  if (!opts.prompt) {
    process.stdout.write('\n');
    console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Prompt is required'));
    process.stdout.write('\n');
    return;
  }

  const originalPrompt = opts.prompt;
  process.stdout.write('\n');
  process.stdout.write(`  ${chalk.dim('✦ Optimizing prompt')}${chalk.dim('...')}`);
  rl.pause();

  try {
    const optimized = await optimizeCommand(originalPrompt, { for: 'video' });
    opts.prompt = optimized;
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#50fa7b')('  ── optimized ──') + '\n');
    process.stdout.write(`  ${chalk.dim(optimized)}\n\n`);
  } catch {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#f1fa8c')('  ⚠ ') + chalk.dim('Optimization failed, using original prompt\n\n'));
  }

  const dims = (opts.width || '1920') + 'x' + (opts.height || '1080');
  process.stdout.write(chalk.hex('#50fa7b').bold(`  ── video ── ${dims}`) + '\n');
  process.stdout.write(`  ${chalk.dim(originalPrompt)}\n\n`);
  const statusMsg = `  ${chalk.dim('✦ Directing')}${chalk.dim('...')}`;
  process.stdout.write(statusMsg);

  try {
    const result = await videoCommand(opts.prompt, {
      model: opts.model || state.settings.videoModel,
      width: opts.width,
      height: opts.height,
      numFrames: opts.numFrames,
      frameRate: opts.frameRate,
      negativePrompt: opts.negativePrompt,
      imageFile: opts.imageFile,
      videoFile: opts.videoFile,
      wait: opts.wait !== false,
      onCreated: (id) => {
        process.stdout.write(`\r${' '.repeat(60)}\r`);
        console.log(chalk.hex('#f1fa8c')(`  ID: ${id}`));
      },
    });

    const output = formatOutput(result);

    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    console.log(chalk.hex('#50fa7b')('  ── result ──'));
    console.log(`  ${chalk.hex('#8be9fd')(output)}\n`);
  } catch (err) {
    process.stdout.write('\n');
    process.stdout.write(chalk.hex('#ff5555')(`  ✗ ${err.message}`));
    if (err.message?.startsWith('[')) {
      process.stdout.write(`\n  ${chalk.dim('Use')} ${chalk.hex('#f1fa8c')('/video-status <id>')} ${chalk.dim('to check later')}`);
    }
    process.stdout.write('\n\n');
  } finally {
    rl.resume();
    rl.prompt();
  }
}

async function handleVideoStatus(rl, state, videoId) {
  process.stdout.write('\n');
  const statusMsg = `  ${chalk.dim('✦ Checking')}${chalk.dim('...')}`;
  process.stdout.write(statusMsg);
  rl.pause();

  try {
    const result = await videoStatus(videoId);

    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    console.log(chalk.hex('#50fa7b')('  ── video status ──'));

    if (result.status === 'completed' || result.status === 'succeeded') {
      const url = result.data?.[0]?.url || result.video?.url || result.output?.[0] || result.url || result.video_url || result.download_url || '';
      console.log(`  ${chalk.dim('Status:')} ${chalk.hex('#50fa7b')('✔ completed')}`);
      if (url) {
        console.log(`  ${chalk.dim('URL:')}    ${chalk.hex('#8be9fd')(url)}`);
      } else {
        console.log(`  ${chalk.dim('Raw:')}   ${chalk.yellow(JSON.stringify(result, null, 2))}`);
      }
    } else if (result.status === 'failed') {
      console.log(`  ${chalk.dim('Status:')} ${chalk.hex('#ff5555')('✗ failed')}`);
      if (result.error) console.log(`  ${chalk.dim('Error:')}  ${result.error}`);
    } else {
      const pct = result.progress !== undefined ? ` ${result.progress}%` : '';
      console.log(`  ${chalk.dim('Status:')} ${chalk.hex('#f1fa8c')('◌ ' + (result.status || 'processing') + pct)}`);
    }
    process.stdout.write('\n');
  } catch (err) {
    process.stdout.write('\n');
    console.log(chalk.hex('#ff5555')(`  ✗ ${err.message}\n`));
  } finally {
    rl.resume();
    rl.prompt();
  }
}

async function handleOptimize(rl, state, rest) {
  const opts = parseOptions(rest);
  if (!opts.prompt) {
    process.stdout.write('\n');
    console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Prompt is required'));
    process.stdout.write('\n');
    return;
  }

  process.stdout.write('\n');
  process.stdout.write(chalk.hex('#50fa7b').bold(`  ── optimize ── for ${opts.for || 'text'}`) + '\n');
  process.stdout.write(`  ${opts.prompt}\n\n`);
  const statusMsg = `  ${chalk.dim('✦ Polishing')}${chalk.dim('...')}`;
  process.stdout.write(statusMsg);
  rl.pause();

  try {
    const result = await optimizeCommand(opts.prompt, {
      for: opts.for || 'text',
    });

    const output = formatOutput(result);

    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#50fa7b')('  ── refined ──') + '\n');
    process.stdout.write(`  ${output}\n\n`);
  } catch (err) {
    process.stdout.write('\n');
    process.stdout.write(chalk.hex('#ff5555')(`  ✗ ${err.message}\n`));
  } finally {
    rl.resume();
    rl.prompt();
  }
}
