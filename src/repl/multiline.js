import chalk from 'chalk';
import stringWidth from 'string-width';

const HEADER_ROWS = 4;
const BOTTOM_ROWS = 1;
const CURSOR_MARGIN = 4;
const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

const ESC = {
  '\x1b[A': 'up',
  '\x1b[B': 'down',
  '\x1b[C': 'right',
  '\x1b[D': 'left',
  '\x1b[H': 'home',
  '\x1b[F': 'end',
  '\x1b[3~': 'del',
};

function toChars(str) {
  return Array.from(str);
}

function widthOf(chars, from, to) {
  let w = 0;
  for (let i = from; i < to; i++) w += stringWidth(chars[i]);
  return w;
}

function findHStart(chars, cursorIdx, maxW) {
  let w = 0;
  let i = cursorIdx;
  while (i > 0) {
    const wch = stringWidth(chars[i - 1]);
    if (w + wch > maxW) break;
    w += wch;
    i--;
  }
  return i;
}

function buildDisplay(chars, hstart, cw) {
  let text = '';
  let width = 0;
  for (let i = hstart; i < chars.length; i++) {
    const wch = stringWidth(chars[i]);
    if (width + wch > cw) {
      if (width < cw) text += '…';
      break;
    }
    width += wch;
    text += chars[i];
  }
  return { text, width };
}

function matchEscape(p) {
  for (const [seq, name] of Object.entries(ESC)) {
    if (p.startsWith(seq)) return { name, len: seq.length };
  }
  if (p.startsWith(PASTE_START)) return { name: 'pasteStart', len: PASTE_START.length };
  if (p.startsWith(PASTE_END)) return { name: 'pasteEnd', len: PASTE_END.length };
  return null;
}

function csiEnd(p) {
  for (let i = 1; i < p.length; i++) {
    const code = p.charCodeAt(i);
    if (code >= 0x40 && code <= 0x7e) return i + 1;
  }
  return -1;
}

export function multilineEditor({ title = '◆  Compose Message' } = {}) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const editor = { lines: [''], row: 0, col: 0 };
    let cancelled = false;
    let pending = '';
    let inPaste = false;
    let lastCursorRow = 0;
    let lastCursorCol = 0;
    let prevBlockTop = -1;

    const origSigint = process.listeners('SIGINT').pop();
    process.removeAllListeners('SIGINT');
    process.on('SIGINT', () => {});

    try { stdin.setRawMode(true); } catch {}
    stdin.resume();

    function screenRows() { return stdout.rows || 24; }
    function screenCols() { return stdout.columns || 80; }

    function moveTo(row, col) {
      const r = Math.abs(lastCursorRow - row);
      if (r > 0) stdout.write(row < lastCursorRow ? `\x1b[${r}A` : `\x1b[${r}B`);
      const c = Math.abs(lastCursorCol - col);
      if (c > 0) stdout.write(col < lastCursorCol ? `\x1b[${c}D` : `\x1b[${c}C`);
      lastCursorRow = row;
      lastCursorCol = col;
    }

    function refresh() {
      const rows = screenRows();
      const tw = screenCols();
      const cw = Math.max(30, tw - 7);
      const totalLines = editor.lines.length;
      const maxBody = Math.max(1, rows - HEADER_ROWS - BOTTOM_ROWS);
      const bodyCount = Math.min(totalLines, maxBody);
      const visibleStart = Math.max(0, Math.min(editor.row - bodyCount + 1, totalLines - bodyCount));
      const blockHeight = HEADER_ROWS + bodyCount + BOTTOM_ROWS;
      const blockTop = Math.max(0, rows - blockHeight);

      const bar = '─'.repeat(cw + 2);
      const top = chalk.hex('#00d4ff')(' ╭' + bar + '╮');
      const titleLine = chalk.hex('#00c4ff')(' │ ') + chalk.bold(title.padEnd(cw)) + chalk.hex('#00c4ff')(' │');
      const hint = chalk.hex('#00b8ff')(' │ ') + chalk.dim('Ctrl+D=submit  Ctrl+C=cancel  Enter=newline'.padEnd(cw)) + chalk.hex('#00b8ff')(' │');
      const sep = chalk.hex('#00d4ff')(' ├' + bar + '┤');
      const bot = ' ╰' + bar + '╯';

      const curChars = toChars(editor.lines[editor.row]);
      const cursorWidth = widthOf(curChars, 0, editor.col);
      const hstart = cursorWidth > cw - CURSOR_MARGIN
        ? findHStart(curChars, editor.col, cw - CURSOR_MARGIN)
        : 0;
      const hstartWidth = widthOf(curChars, 0, hstart);

      const out = [top, titleLine, hint, sep];
      for (let i = visibleStart; i < visibleStart + bodyCount; i++) {
        const chars = i === editor.row ? curChars : toChars(editor.lines[i]);
        const hs = i === editor.row ? hstart : 0;
        const { text, width } = buildDisplay(chars, hs, cw);
        const padded = text + ' '.repeat(Math.max(0, cw - width));
        out.push(chalk.hex('#00b8ff')(' │ ') + padded + chalk.hex('#00b8ff')(' │'));
      }
      out.push(chalk.hex('#00d4ff')(bot));

      if (prevBlockTop < 0) {
        moveTo(blockTop, 0);
        stdout.write(out.join('\n'));
      } else {
        const clearFrom = Math.min(prevBlockTop, blockTop);
        moveTo(clearFrom, 0);
        stdout.write('\x1b[J' + out.join('\n'));
      }

      prevBlockTop = blockTop;
      lastCursorRow = blockTop + blockHeight - 1;
      lastCursorCol = out[out.length - 1].length;

      const lineOffset = HEADER_ROWS + (editor.row - visibleStart);
      const displayCursorCol = 3 + (cursorWidth - hstartWidth);
      moveTo(blockTop + lineOffset, displayCursorCol);
    }

    function cleanup() {
      try { stdin.setRawMode(false); } catch {}
      stdin.removeListener('data', dataHandler);
      moveTo(Math.max(0, prevBlockTop), 0);
      stdout.write('\x1b[J\x1b[?25h');
      process.removeAllListeners('SIGINT');
      if (origSigint) process.on('SIGINT', origSigint);
      resolve(cancelled ? '' : editor.lines.join('\n'));
    }

    function enter() {
      const chars = toChars(editor.lines[editor.row]);
      editor.lines[editor.row] = chars.slice(0, editor.col).join('');
      editor.lines.splice(editor.row + 1, 0, chars.slice(editor.col).join(''));
      editor.row++;
      editor.col = 0;
    }

    function backspace() {
      const chars = toChars(editor.lines[editor.row]);
      if (editor.col > 0) {
        editor.lines[editor.row] = chars.slice(0, editor.col - 1).concat(chars.slice(editor.col)).join('');
        editor.col--;
      } else if (editor.row > 0) {
        const prevLen = toChars(editor.lines[editor.row - 1]).length;
        editor.lines[editor.row - 1] += editor.lines[editor.row];
        editor.lines.splice(editor.row, 1);
        editor.row--;
        editor.col = prevLen;
      }
    }

    function cursorUp() {
      if (editor.row > 0) {
        editor.row--;
        editor.col = Math.min(editor.col, toChars(editor.lines[editor.row]).length);
      }
    }
    function cursorDown() {
      if (editor.row < editor.lines.length - 1) {
        editor.row++;
        editor.col = Math.min(editor.col, toChars(editor.lines[editor.row]).length);
      }
    }
    function cursorLeft() {
      if (editor.col > 0) editor.col--;
      else if (editor.row > 0) {
        editor.row--;
        editor.col = toChars(editor.lines[editor.row]).length;
      }
    }
    function cursorRight() {
      if (editor.col < toChars(editor.lines[editor.row]).length) editor.col++;
      else if (editor.row < editor.lines.length - 1) {
        editor.row++;
        editor.col = 0;
      }
    }
    function deleteCharAt() {
      const chars = toChars(editor.lines[editor.row]);
      if (editor.col < chars.length) {
        editor.lines[editor.row] = chars.slice(0, editor.col).concat(chars.slice(editor.col + 1)).join('');
      } else if (editor.row < editor.lines.length - 1) {
        editor.lines[editor.row] += editor.lines[editor.row + 1];
        editor.lines.splice(editor.row + 1, 1);
      }
    }

    function insertChar(c) {
      const chars = toChars(editor.lines[editor.row]);
      chars.splice(editor.col, 0, c);
      editor.lines[editor.row] = chars.join('');
      editor.col++;
    }

    function handlePasteText(text) {
      for (const ch of text) {
        if (ch === '\r' || ch === '\n') enter();
        else insertChar(ch);
      }
    }

    function handleEscape(name) {
      switch (name) {
        case 'left': cursorLeft(); break;
        case 'right': cursorRight(); break;
        case 'up': cursorUp(); break;
        case 'down': cursorDown(); break;
        case 'home': editor.col = 0; break;
        case 'end': editor.col = toChars(editor.lines[editor.row]).length; break;
        case 'del': deleteCharAt(); break;
        case 'pasteStart': inPaste = true; break;
        case 'pasteEnd': break;
      }
    }

    function processPending() {
      while (pending.length > 0) {
        if (inPaste) {
          const end = pending.indexOf(PASTE_END);
          if (end === -1) {
            handlePasteText(pending);
            pending = '';
            refresh();
            return;
          }
          handlePasteText(pending.slice(0, end));
          pending = pending.slice(end + PASTE_END.length);
          inPaste = false;
          refresh();
          continue;
        }

        if (pending.startsWith('\x1b')) {
          const m = matchEscape(pending);
          if (!m) {
            const end = csiEnd(pending);
            if (end > 0) {
              pending = pending.slice(end);
              continue;
            }
            return;
          }
          handleEscape(m.name);
          pending = pending.slice(m.len);
          refresh();
          continue;
        }

        const ch = pending.codePointAt(0);
        const width = ch > 0xffff ? 2 : 1;
        if (ch === 0x0d || ch === 0x0a) enter();
        else if (ch === 0x7f || ch === 0x08) backspace();
        else if (ch === 0x04) { cleanup(); return; }
        else if (ch === 0x03) { cancelled = true; cleanup(); return; }
        else insertChar(String.fromCodePoint(ch));
        pending = pending.slice(width);
        refresh();
      }
    }

    const dataHandler = (buf) => {
      try {
        pending += buf.toString();
        processPending();
      } catch (err) {
        cleanup();
        throw err;
      }
    };

    stdin.on('data', dataHandler);
    stdout.write('\x1b[?25l');
    refresh();
  });
}
