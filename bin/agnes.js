#!/usr/bin/env node

import { textCommand } from '../src/commands/text.js';
import { imageCommand } from '../src/commands/image.js';
import { videoCommand, videoStatus, listVideoTasks } from '../src/commands/video.js';
import { optimizeCommand } from '../src/commands/optimize.js';
import { startInteractive } from '../src/interactive.js';
import { parseSize, formatOutput } from '../src/utils.js';
import chalk from 'chalk';

function help() {
  console.log(`
${chalk.bold('agnes')} - Agnes AI CLI Tool (text, image, video, prompt optimization)

  ${chalk.bold('USAGE')}
  agnes                           Interactive shell mode
  agnes <command> [options] <prompt>
  agnes --interactive             Force interactive mode

${chalk.bold('COMMANDS')}
  ${chalk.cyan('text')}       Generate text with agnes-2.0-flash
  ${chalk.cyan('image')}      Generate image with agnes-image-2.1-flash
  ${chalk.cyan('video')}      Generate video with agnes-video-v2.0
  ${chalk.cyan('video-status')}  Check video generation status by ID
  ${chalk.cyan('video-list')}    List recent video tasks
  ${chalk.cyan('optimize')}   Optimize a prompt for AI generation

${chalk.bold('GLOBAL OPTIONS')}
  --api-key <key>         Agnes API key (also via AGNES_API_KEY env)
  --json                  Output raw JSON
  --interactive           Force interactive shell mode
  -h, --help              Show this help

${chalk.bold('TEXT OPTIONS')}
  --system <text>         System prompt
  --temperature <n>       Sampling temperature (0-2)
  --max-tokens <n>        Max tokens to generate
  --model <name>          Model name (default: agnes-2.0-flash)
  --stream                Stream the response

${chalk.bold('IMAGE OPTIONS')}
  --size <WxH>            Image size, e.g. 1024x768 (default: 1024x1024)
  --model <name>          Model name (default: agnes-image-2.1-flash)
  --output <path>         Save image to file
  --image-file <path>     Reference image for img2img generation
  -i <path>               Shorthand for --image-file

${chalk.bold('VIDEO OPTIONS')}
  --width <px>            Video width (default: 1920)
  --height <px>           Video height (default: 1080)
  --num-frames <n>        Number of frames (8n+1, max 441)
  --frame-rate <n>        Frames per second (1-60, default: 60)
  --negative-prompt <t>   What to avoid in generation
  --seed <n>              Random seed for reproducibility
  --no-wait               Return immediately without polling
  --model <name>          Model name (default: agnes-video-v2.0)
  --image-file <path>     Reference image for img2vid generation
  -i <path>               Shorthand for --image-file
  --video-file <path>     Reference video for vid2vid generation
  -f <path>               Shorthand for --video-file

${chalk.bold('OPTIMIZE OPTIONS')}
  --for <type>            Target type: text, image, video (default: text)

${chalk.bold('EXAMPLES')}
  agnes                           Start interactive shell
  agnes text "Explain quantum computing in simple terms"
  agnes text --stream --system "You are a poet" "Write a poem about AI"
  agnes image "A cat wearing a spacesuit on Mars" --size 1024x768
  agnes image "Make it a cyberpunk style" -i input.jpg
  agnes video "A drone flying over a futuristic city at sunset"
  agnes video "Make it move like this" -i style.png
  agnes video "Extend this video" -f input.mp4
  agnes video-status <video_id>
  agnes optimize "a dog running" --for image
  agnes optimize "explain climate change" --for text
`);
}

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--interactive' || args[0] === '-i') {
    return null;
  }

  if (args[0] === '--help' || args[0] === '-h') {
    help();
    process.exit(0);
  }

  const command = args[0];
  const validCommands = ['text', 'image', 'video', 'video-status', 'video-list', 'optimize'];
  if (!validCommands.includes(command)) {
    console.error(chalk.red(`Unknown command: ${command}`));
    help();
    process.exit(1);
  }

  const options = {
    json: false,
    stream: false,
    wait: true,
  };

  let promptParts = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--api-key':
        process.env.AGNES_API_KEY = args[++i];
        break;
      case '--json':
        options.json = true;
        break;
      case '--system':
        options.system = args[++i];
        break;
      case '--temperature':
        options.temperature = parseFloat(args[++i]);
        break;
      case '--max-tokens':
      case '--max-token':
        options.maxTokens = parseInt(args[++i]);
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--stream':
        options.stream = true;
        break;
      case '--size':
        options.size = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--width':
        options.width = parseInt(args[++i]);
        break;
      case '--height':
        options.height = parseInt(args[++i]);
        break;
      case '--num-frames':
      case '--num_frames':
      case '--frames':
        options.numFrames = parseInt(args[++i]);
        break;
      case '--frame-rate':
      case '--frame_rate':
      case '--fps':
        options.frameRate = parseInt(args[++i]);
        break;
      case '--negative-prompt':
      case '--negative_prompt':
      case '--neg':
        options.negativePrompt = args[++i];
        break;
      case '--seed':
        options.seed = parseInt(args[++i]);
        break;
      case '--no-wait':
      case '--no_wait':
        options.wait = false;
        break;
      case '--image-file':
      case '-i':
        options.imageFile = args[++i];
        break;
      case '--video-file':
      case '-f':
        options.videoFile = args[++i];
        break;
      case '--for':
        options.for = args[++i];
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(chalk.yellow(`Unknown option: ${arg}`));
        } else {
          promptParts.push(arg);
        }
    }
  }

  const prompt = promptParts.join(' ');
  if (!prompt && command !== 'optimize' && command !== 'video-status' && command !== 'video-list') {
    console.error(chalk.red(`Error: <prompt> is required for "${command}" command`));
    process.exit(1);
  }

  return { command, prompt, options };
}

async function main() {
  const parsed = parseArgs();
  if (!parsed) {
    await startInteractive();
    return;
  }

  const { command, prompt, options } = parsed;

  try {
    let result;

    switch (command) {
      case 'text':
        result = await textCommand(prompt, options);
        break;
      case 'image':
        result = await imageCommand(prompt, options);
        break;
      case 'video':
        result = await videoCommand(prompt, options);
        break;
      case 'video-status':
        if (!prompt) {
          console.error(chalk.red('Error: <video_id> is required'));
          console.log(chalk.dim('Usage: agnes video-status <video_id>'));
          process.exit(1);
        }
        result = await videoStatus(prompt);
        break;
      case 'video-list':
        {
          const tasks = listVideoTasks();
          if (tasks.length === 0) {
            console.log(chalk.dim('\n(no recent video tasks)\n'));
          } else {
            console.log(chalk.green('\n=== Recent Video Tasks ==='));
            tasks.slice(0, 10).forEach((t, i) => {
              console.log(`  ${chalk.cyan(t.videoId)}  ${chalk.dim(t.createdAt)}`);
              console.log(`  ${chalk.dim(t.prompt.slice(0, 72))}${t.prompt.length > 72 ? chalk.dim('…') : ''}`);
              if (i < Math.min(tasks.length, 10) - 1) console.log('');
            });
            console.log('');
          }
        }
        result = undefined;
        break;
      case 'optimize':
        result = await optimizeCommand(prompt || '', options);
        break;
    }

    if (result !== undefined) {
      const output = formatOutput(result, options.json ? 'json' : 'text');
      if (options.json) {
        console.log(output);
      } else {
        console.log(chalk.green('\n=== Result ==='));
        console.log(output);
      }
    }
  } catch (err) {
    console.error(chalk.red(`\nError: ${err.message}`));
    process.exit(1);
  }
}

main();
