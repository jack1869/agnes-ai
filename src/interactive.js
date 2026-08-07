import readline from 'node:readline';
import fs from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import ora from 'ora';
import { sleep, loadEnv } from './utils.js';
import { buildBanner, FOOTER } from './repl/banner.js';
import { multilineEditor } from './repl/multiline.js';
import { handleLine, handleImage, handleVideo, parseOptions } from './repl/handlers.js';

const HISTORY_FILE = join(homedir(), '.agnes', 'repl_history.json');
const HISTORY_SIZE = 500;

function loadHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    return Array.isArray(raw) ? raw.slice(-HISTORY_SIZE) : [];
  } catch {
    return [];
  }
}

function appendHistory(line) {
  const lines = loadHistory();
  if (lines[lines.length - 1] === line) return;
  lines.push(line);
  try {
    fs.mkdirSync(join(homedir(), '.agnes'), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(lines.slice(-HISTORY_SIZE), null, 2), 'utf-8');
  } catch {}
}

function ensureApiKey() {
  return new Promise((resolve) => {
    if (process.env.AGNES_API_KEY) {
      resolve();
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(chalk.hex('#f1fa8c')('No AGNES_API_KEY found. Enter your API key: '), (key) => {
      rl.close();
      const trimmed = key.trim();
      if (trimmed) process.env.AGNES_API_KEY = trimmed;
      resolve();
    });
  });
}

export async function startInteractive() {
  loadEnv();
  await ensureApiKey();

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
      model: 'agnes-2.5-flash',
      imageModel: 'agnes-image-2.1-flash',
      videoModel: 'agnes-video-v2.0',
      temperature: undefined,
      maxTokens: undefined,
    },
    history: [],
  };

  let rlClosing = false;

  function composeTitle(kind) {
    return kind === 'image' ? '◆  Compose Image Prompt'
      : kind === 'video' ? '◆  Compose Video Prompt'
      : '◆  Compose Message';
  }

  async function composeFor(rl, kind) {
    rlClosing = true;
    rl.close();
    rlClosing = false;
    const answer = await multilineEditor({ title: composeTitle(kind) });
    const newRl = makeRl();
    console.log('');
    if (!answer.trim()) {
      console.log(chalk.dim('  (cancelled)\n'));
      newRl.prompt();
      return null;
    }
    console.log(chalk.hex('#50fa7b')('  ── composed ──') + '\n');
    return { rl: newRl, text: answer.trim() };
  }

  function makeRl() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.hex('#50fa7b')('agnes> '),
      terminal: true,
    });

    const history = loadHistory();
    try {
      rl.history = history;
    } catch {}

    const lineHandler = async (raw) => {
      const trimmed = raw.trim();

      if (trimmed === '/input' || trimmed === '/compose') {
        const composed = await composeFor(rl, 'message');
        if (composed) {
          await handleLine(composed.rl, state, composed.text);
        }
        return;
      }

      const mediaMatch = trimmed.match(/^\/(image|video)(?:\s+(.*))?$/i);
      if (mediaMatch) {
        const kind = mediaMatch[1].toLowerCase();
        const rest = mediaMatch[2] || '';
        const parsed = parseOptions(rest);
        if (!parsed.prompt) {
          const composed = await composeFor(rl, kind);
          if (composed) {
            const text = composed.text.replace(/\s+/g, ' ');
            const opts = { ...parsed, prompt: text };
            if (kind === 'image') {
              await handleImage(composed.rl, state, text, opts);
            } else {
              await handleVideo(composed.rl, state, text, opts);
            }
          }
          return;
        }
      }

      if (!trimmed) {
        rl.prompt();
        return;
      }

      appendHistory(trimmed);
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
