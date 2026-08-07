import chalk from 'chalk';
import { textCommand } from '../commands/text.js';
import { imageCommand } from '../commands/image.js';
import { videoCommand, videoStatus, listVideoTasks } from '../commands/video.js';
import { optimizeCommand } from '../commands/optimize.js';
import { formatOutput, autoSavePath, downloadFile, extractUrl, readFileAsBase64, saveBase64File } from '../utils.js';
import { HELP_TEXT } from './banner.js';

export async function handleLine(rl, state, line) {
  if (line.startsWith('/')) {
    await handleCommand(rl, state, line);
    return;
  }

  await handleText(rl, state, line);
}

export function parseOptions(rest) {
  const parts = rest.split(' ');
  const options = {};
  const promptParts = [];

  for (let i = 0; i < parts.length; i++) {
    switch (parts[i]) {
      case '--size':
        options.size = parts[++i];
        break;
      case '--ratio':
        options.ratio = parts[++i];
        break;
      case '--return-base64':
        options.returnBase64 = true;
        break;
      case '--top-p':
        options.topP = parseFloat(parts[++i]);
        break;
      case '--thinking':
        options.thinking = true;
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
      case '--motion':
        options.motion = parseInt(parts[++i]);
        break;
      case '--mode':
        options.mode = parts[++i];
        break;
      case '--steps':
        options.steps = parseInt(parts[++i]);
        break;
      case '--no-wait':
        options.wait = false;
        break;
      case '--no-opt':
        options.noOpt = true;
        break;
      case '--output':
        options.output = parts[++i];
        break;
      case '--for':
        options.for = parts[++i];
        break;
      case '--seed':
        options.seed = parseInt(parts[++i]);
        break;
      case '--image-file':
      case '-i':
        options.imageFiles ??= [];
        options.imageFiles.push(parts[++i]);
        break;
      case '--image-url':
        options.imageUrls ??= [];
        options.imageUrls.push(parts[++i]);
        break;
      case '--keyframe':
      case '-k':
        options.keyframes ??= [];
        options.keyframes.push(parts[++i]);
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

function formatTimeAgo(timestamp, now) {
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
        console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Usage: /image <prompt> [--size WxH] [--image-file/-i P] [--no-opt]'));
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

async function optimizePromptFor(prompt, target) {
  try {
    const optimized = await optimizeCommand(prompt, { for: target });
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#50fa7b')('  ── optimized ──') + '\n');
    process.stdout.write(`  ${chalk.dim(optimized)}\n\n`);
    return optimized;
  } catch {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    process.stdout.write(chalk.hex('#f1fa8c')('  ⚠ ') + chalk.dim('Optimization failed, using original prompt\n\n'));
    return prompt;
  }
}

export async function handleImage(rl, state, rest, raw = false) {
  const opts = typeof raw === 'object'
    ? raw
    : raw
      ? { prompt: rest.replace(/\s+/g, ' ').trim() }
      : parseOptions(rest);
  if (!opts.prompt) {
    process.stdout.write('\n');
    console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Prompt is required'));
    process.stdout.write('\n');
    return;
  }

  const originalPrompt = opts.prompt;
  let effectivePrompt = originalPrompt;
  process.stdout.write('\n');

  if (!opts.noOpt) {
    process.stdout.write(`  ${chalk.dim('✦ Optimizing prompt')}${chalk.dim('...')}`);
    rl.pause();
    effectivePrompt = await optimizePromptFor(originalPrompt, 'image');
    rl.resume();
  }

  process.stdout.write(chalk.hex('#50fa7b').bold(`  ── image ── ${opts.size || '1K'}${opts.ratio ? ' ' + opts.ratio : ''}`) + '\n');
  process.stdout.write(`  ${chalk.dim(originalPrompt)}\n\n`);
  process.stdout.write(`  ${chalk.dim('✦ Painting')}${chalk.dim('...')}`);

  try {
    const result = await imageCommand(effectivePrompt, {
      model: opts.model || state.settings.imageModel,
      size: opts.size || '1K',
      ratio: opts.ratio,
      images: [
        ...(opts.imageUrls || []),
        ...(opts.imageFiles || []).map(readFileAsBase64),
      ],
      returnBase64: opts.returnBase64,
      output: opts.output,
    });

    let final = result;
    if (!opts.output) {
      const item = result.data?.[0];
      if (item?.url) {
        const ext = (item.url.split('?')[0].match(/\.(\w+)$/)?.[1] || 'png');
        const savePath = autoSavePath('images', ext, `img-${Date.now()}`);
        const saved = await downloadFile(item.url, savePath);
        final = { ...result, savedTo: saved };
      } else if (item?.b64_json) {
        const savePath = autoSavePath('images', 'png', `img-${Date.now()}`);
        const saved = saveBase64File(item.b64_json, savePath);
        final = { ...result, savedTo: saved };
      }
    }

    const output = formatOutput(final);

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

export async function handleVideo(rl, state, rest, raw = false) {
  const opts = typeof raw === 'object'
    ? raw
    : raw
      ? { prompt: rest.replace(/\s+/g, ' ').trim() }
      : parseOptions(rest);
  if (!opts.prompt) {
    process.stdout.write('\n');
    console.log(chalk.hex('#f1fa8c')('  ⚠') + ' ' + chalk.dim('Prompt is required'));
    process.stdout.write('\n');
    return;
  }

  const originalPrompt = opts.prompt;
  let effectivePrompt = originalPrompt;
  process.stdout.write('\n');

  if (!opts.noOpt) {
    process.stdout.write(`  ${chalk.dim('✦ Optimizing prompt')}${chalk.dim('...')}`);
    rl.pause();
    effectivePrompt = await optimizePromptFor(originalPrompt, 'video');
    rl.resume();
  }

  const dims = (opts.width || '1152') + 'x' + (opts.height || '768');
  process.stdout.write(chalk.hex('#50fa7b').bold(`  ── video ── ${dims}`) + '\n');
  process.stdout.write(`  ${chalk.dim(originalPrompt)}\n\n`);
  process.stdout.write(`  ${chalk.dim('✦ Directing')}${chalk.dim('...')}`);

  try {
    const result = await videoCommand(effectivePrompt, {
      model: opts.model || state.settings.videoModel,
      width: opts.width,
      height: opts.height,
      numFrames: opts.numFrames,
      frameRate: opts.frameRate,
      negativePrompt: opts.negativePrompt,
      motion: opts.motion,
      steps: opts.steps,
      mode: opts.mode,
      imageFiles: opts.imageFiles,
      imageUrls: opts.imageUrls,
      keyframes: opts.keyframes,
      videoFile: opts.videoFile,
      wait: opts.wait !== false,
      output: opts.output,
      onCreated: (id) => {
        process.stdout.write(`\r${' '.repeat(60)}\r`);
        console.log(chalk.hex('#f1fa8c')(`  ID: ${id}`));
      },
      onProgress: (data) => {
        if (data.progress !== undefined) {
          process.stdout.write(`\r  ${chalk.dim('✦ Directing...')} ${data.progress}%`);
        }
      },
    });

    let final = result;
    if (!opts.output && opts.wait !== false) {
      const url = extractUrl(result);
      if (url) {
        const savePath = autoSavePath('videos', 'mp4', `vid-${Date.now()}`);
        const saved = await downloadFile(url, savePath);
        final = { ...result, savedTo: saved };
      }
    }

    const output = formatOutput(final);

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
      const url = extractUrl(result);
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
