import chalk from 'chalk';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const VERSION = require('../../package.json').version;

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

export function buildBanner() {
  const infoLines = [
    ("  ◆  AI Interactive Shell  ●  v" + VERSION),
    ("  ◆  Model: agnes-2.5-flash"),
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

export const FOOTER = chalk.hex('#8855ff')('  Type /help for commands') + chalk.dim('  ·  ') + chalk.hex('#8855ff')('/exit to quit');

export const HELP_TEXT = `
${chalk.hex('#50fa7b').bold(' ── Commands ──')}
  ${chalk.hex('#d2d2d2')('<text>')}              ${chalk.dim('Send a message (text, keeps context)')}
  ${chalk.hex('#d2d2d2')('/text <msg>')}         ${chalk.dim('Text generation')}
  ${chalk.hex('#d2d2d2')('/input')}               ${chalk.dim('Multi-line input (Ctrl+D=submit, Ctrl+C=cancel)')}
  ${chalk.hex('#d2d2d2')('/image <prompt>')}     ${chalk.dim('Generate image  (no prompt → multi-line editor)')}
  ${chalk.dim('                     [--size WxH|1K|2K|3K|4K] [--ratio R] [--image-file/-i P]')}
  ${chalk.dim('                     [--image-url U] [--return-base64] [--no-opt] [--output PATH]')}
  ${chalk.hex('#d2d2d2')('/video <prompt>')}     ${chalk.dim('Generate video  (no prompt → multi-line editor)')}
  ${chalk.dim('                     [--frames N] [--fps N] [--neg T] [--no-wait]')}
  ${chalk.dim('                     [--image-file/-i P] [--video-file/-f P] [--keyframe/-k P]')}
  ${chalk.dim('                     [--mode M] [--steps N] [--no-opt] [--output PATH]')}
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
  ${chalk.dim('text :')}  agnes-2.5-flash
  ${chalk.dim('image:')}  agnes-image-2.1-flash
  ${chalk.dim('video:')}  agnes-video-v2.0
`;

export function box(text) {
  const width = text.length + 4;
  const line = chalk.hex('#50fa7b').dim('\u2500');
  const top = chalk.hex('#50fa7b').dim('\u250C') + line.repeat(width) + chalk.hex('#50fa7b').dim('\u2510');
  const mid = chalk.hex('#50fa7b').dim('\u2502 ') + text + chalk.hex('#50fa7b').dim(' \u2502');
  const bot = chalk.hex('#50fa7b').dim('\u2514') + line.repeat(width) + chalk.hex('#50fa7b').dim('\u2518');
  return `\n${top}\n${mid}\n${bot}\n`;
}
