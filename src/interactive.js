import readline from 'node:readline';
import { textCommand } from './commands/text.js';
import { imageCommand } from './commands/image.js';
import { videoCommand } from './commands/video.js';
import { optimizeCommand } from './commands/optimize.js';
import { formatOutput } from './utils.js';
import chalk from 'chalk';

const BANNER = `
${chalk.hex('#50fa7b')('    ___                      ')}

${chalk.hex('#50fa7b')('   / _ \\  ___  ___ _ __  ___  ___')}
${chalk.hex('#50fa7b')('  / /_\\ \\/ __|/ _ \\ \'_ \\/ __|/ _ \\')}
${chalk.hex('#50fa7b')(' / /_\\\\ /\\__ \\  __/ | | \\__ \\  __/')}
${chalk.hex('#50fa7b')(' \\____/ |___/\\___|_| |_|___/\\___|')}
${chalk.dim('  Agnes AI Interactive Shell')}
`;

const HELP_TEXT = `
${chalk.hex('#50fa7b').bold(' ── Commands ──')}
  ${chalk.hex('#d2d2d2')('<text>')}              ${chalk.dim('Send a message (text, keeps context)')}
  ${chalk.hex('#d2d2d2')('/text <msg>')}         ${chalk.dim('Text generation')}
  ${chalk.hex('#d2d2d2')('/image <prompt>')}     ${chalk.dim('Generate image  [--size WxH]')}
  ${chalk.hex('#d2d2d2')('/video <prompt>')}     ${chalk.dim('Generate video  [--width W] [--height H]')}
  ${chalk.dim('                     [--frames N] [--fps N] [--neg T] [--no-wait]')}
  ${chalk.hex('#d2d2d2')('/optimize <prompt>')}  ${chalk.dim('Optimize prompt [--for text|image|video]')}
  ${chalk.hex('#d2d2d2')('/system <text>')}      ${chalk.dim('Set system prompt')}
  ${chalk.hex('#d2d2d2')('/model <t> <m>')}      ${chalk.dim('Switch model (text|image|video)')}
  ${chalk.hex('#d2d2d2')('/clear')}              ${chalk.dim('Clear conversation')}
  ${chalk.hex('#d2d2d2')('/history')}            ${chalk.dim('Show conversation log')}
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
  process.stdout.write('\n');
  console.log(BANNER);
  console.log(chalk.dim('  Type /help for commands  ·  /exit to quit'));
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

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.hex('#50fa7b')('agnes> '),
    terminal: true,
  });

  rl.prompt();

  rl.on('line', async (raw) => {
    const line = raw.trim();
    if (!line) {
      rl.prompt();
      return;
    }

    await handleLine(rl, state, line);
    rl.prompt();
  });

  rl.on('close', () => {
    process.stdout.write('\n');
    console.log(chalk.dim('Goodbye.'));
    process.exit(0);
  });

  process.on('SIGINT', () => {
    process.stdout.write('\n');
    console.log(chalk.dim('Goodbye.'));
    process.exit(0);
  });

  return new Promise(() => {});
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
        console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /image <prompt> [--size WxH]'));
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

  process.stdout.write('\n');
  process.stdout.write(chalk.hex('#50fa7b').bold(`  ── image ── ${opts.size || '1024x1024'}`) + '\n');
  process.stdout.write(`  ${opts.prompt}\n\n`);
  const statusMsg = `  ${chalk.dim('✦ Painting')}${chalk.dim('...')}`;
  process.stdout.write(statusMsg);
  rl.pause();

  try {
    const result = await imageCommand(opts.prompt, {
      model: opts.model || state.settings.imageModel,
      size: opts.size || '1024x1024',
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

  process.stdout.write('\n');
  const dims = (opts.width || '1920') + 'x' + (opts.height || '1080');
  process.stdout.write(chalk.hex('#50fa7b').bold(`  ── video ── ${dims}`) + '\n');
  process.stdout.write(`  ${opts.prompt}\n\n`);
  const statusMsg = `  ${chalk.dim('✦ Directing')}${chalk.dim('...')}`;
  process.stdout.write(statusMsg);
  rl.pause();

  try {
    const result = await videoCommand(opts.prompt, {
      model: opts.model || state.settings.videoModel,
      width: opts.width,
      height: opts.height,
      numFrames: opts.numFrames,
      frameRate: opts.frameRate,
      negativePrompt: opts.negativePrompt,
      wait: opts.wait !== false,
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
