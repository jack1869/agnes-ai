import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const editorUrl = new URL('../src/repl/multiline.js', import.meta.url).href;

const CHILD = `
import { multilineEditor } from ${JSON.stringify(editorUrl)};
process.stdin.resume();
const result = await multilineEditor();
process.stdout.write('RESULT:' + JSON.stringify(result));
process.exit(0);
`;

function runEditor(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', CHILD], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`child exit ${code}: ${err}`));
      const m = out.match(/RESULT:(.*)$/s);
      resolve(m ? JSON.parse(m[1]) : '');
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

test('multiline editor: basic multi-line input', async () => {
  const result = await runEditor('第一行\r第二行\x04');
  assert.equal(result, '第一行\n第二行');
});

test('multiline editor: emoji surrogate pairs preserved', async () => {
  const result = await runEditor('😀🌍\x04');
  assert.equal(result, '😀🌍');
});

test('multiline editor: very long single line keeps full content', async () => {
  const line = 'a'.repeat(200);
  const result = await runEditor(line + '\x04');
  assert.equal(result.length, 200);
});

test('multiline editor: bracket paste handles newlines', async () => {
  const result = await runEditor('\x1b[200~hello\rworld\x1b[201~\x04');
  assert.equal(result, 'hello\nworld');
});

test('multiline editor: backspace deletes previous char', async () => {
  const result = await runEditor('abc\x7f\x04');
  assert.equal(result, 'ab');
});

test('multiline editor: Ctrl+C cancels', async () => {
  const result = await runEditor('abc\x03');
  assert.equal(result, '');
});
