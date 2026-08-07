#!/usr/bin/env node

import { textCommand } from '../src/commands/text.js';
import { imageCommand } from '../src/commands/image.js';
import { videoCommand, videoStatus, listVideoTasks } from '../src/commands/video.js';
import { optimizeCommand } from '../src/commands/optimize.js';
import { startInteractive } from '../src/interactive.js';
import { parseArgs, help, VERSION } from '../src/cli/args.js';
import { loadEnv, formatOutput } from '../src/utils.js';
import chalk from 'chalk';

loadEnv();

async function main() {
  const parsed = parseArgs();

  if (parsed?.help) {
    help();
    process.exit(0);
  }

  if (parsed?.version) {
    console.log(`agnes v${VERSION}`);
    process.exit(0);
  }

  if (parsed?.error) {
    console.error(chalk.red(parsed.error));
    if (!parsed.error.startsWith('Unknown')) help();
    process.exit(1);
  }

  if (!parsed) {
    await startInteractive();
    return;
  }

  const { command, prompt, options } = parsed;

  if (options.unknownOptions?.length) {
    for (const opt of options.unknownOptions) {
      console.error(chalk.yellow(`Unknown option: ${opt}`));
    }
  }

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
