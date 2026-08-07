import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cli/args.js';

test('no args means interactive', () => {
  assert.equal(parseArgs([]), null);
  assert.equal(parseArgs(['--interactive']), null);
});

test('version flags', () => {
  assert.deepEqual(parseArgs(['--version']), { version: true });
  assert.deepEqual(parseArgs(['-v']), { version: true });
});

test('help flags', () => {
  assert.deepEqual(parseArgs(['--help']), { help: true });
  assert.deepEqual(parseArgs(['-h']), { help: true });
});

test('-i as first arg is no longer interactive', () => {
  const parsed = parseArgs(['-i', 'input.jpg']);
  assert.equal(parsed.error, 'Unknown command: -i');
});

test('image command parses options', () => {
  const parsed = parseArgs(['image', 'a cat', '--size', '1024x768', '--output', 'cat.png']);
  assert.equal(parsed.command, 'image');
  assert.equal(parsed.prompt, 'a cat');
  assert.equal(parsed.options.size, '1024x768');
  assert.equal(parsed.options.output, 'cat.png');
});

test('image -i shorthand for --image-file', () => {
  const parsed = parseArgs(['image', 'style it', '-i', 'in.jpg']);
  assert.deepEqual(parsed.options.imageFiles, ['in.jpg']);
});

test('image parses ratio/return-base64/image-url', () => {
  const parsed = parseArgs(['image', 'a cat', '--ratio', '16:9', '--return-base64', '--image-url', 'https://x/a.png', '-i', 'b.jpg']);
  assert.equal(parsed.options.ratio, '16:9');
  assert.equal(parsed.options.returnBase64, true);
  assert.deepEqual(parsed.options.imageUrls, ['https://x/a.png']);
  assert.deepEqual(parsed.options.imageFiles, ['b.jpg']);
});

test('text parses top-p/thinking/image files', () => {
  const parsed = parseArgs(['text', 'what is this', '--top-p', '0.9', '--thinking', '-i', 'pic.png', '--image-url', 'https://x/p.png']);
  assert.equal(parsed.options.topP, 0.9);
  assert.equal(parsed.options.thinking, true);
  assert.deepEqual(parsed.options.imageFiles, ['pic.png']);
  assert.deepEqual(parsed.options.imageUrls, ['https://x/p.png']);
});

test('video parses keyframes/mode/steps', () => {
  const parsed = parseArgs(['video', 'animate', '-k', 'k1.png', '-k', 'k2.png', '--mode', 'keyframes', '--steps', '50']);
  assert.deepEqual(parsed.options.keyframes, ['k1.png', 'k2.png']);
  assert.equal(parsed.options.mode, 'keyframes');
  assert.equal(parsed.options.steps, 50);
});

test('video command parses motion/frames/fps', () => {
  const parsed = parseArgs(['video', 'drone', '--motion', '3', '--frames', '81', '--fps', '30', '--neg', 'blur']);
  assert.equal(parsed.options.motion, 3);
  assert.equal(parsed.options.numFrames, 81);
  assert.equal(parsed.options.frameRate, 30);
  assert.equal(parsed.options.negativePrompt, 'blur');
});

test('video --no-wait sets wait false', () => {
  const parsed = parseArgs(['video', 'x', '--no-wait']);
  assert.equal(parsed.options.wait, false);
});

test('missing prompt errors for text', () => {
  const parsed = parseArgs(['text']);
  assert.match(parsed.error, /required/);
});

test('optimize allows empty prompt and parses --for', () => {
  const parsed = parseArgs(['optimize', 'run', '--for', 'image']);
  assert.equal(parsed.prompt, 'run');
  assert.equal(parsed.options.for, 'image');
});

test('unknown long option is collected, prompt preserved', () => {
  const parsed = parseArgs(['text', 'hi', '--bogus']);
  assert.equal(parsed.prompt, 'hi');
  assert.deepEqual(parsed.options.unknownOptions, ['--bogus']);
});
