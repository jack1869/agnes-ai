import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions } from '../src/repl/handlers.js';

test('parseOptions with only options yields empty prompt', () => {
  const parsed = parseOptions('--frames 441 --fps 24');
  assert.equal(parsed.prompt, '');
  assert.equal(parsed.numFrames, 441);
  assert.equal(parsed.frameRate, 24);
});

test('parseOptions empty input yields empty prompt', () => {
  assert.equal(parseOptions('').prompt, '');
});

test('parseOptions keeps prompt when present', () => {
  const parsed = parseOptions('一只猫在跑 --frames 81');
  assert.equal(parsed.prompt, '一只猫在跑');
  assert.equal(parsed.numFrames, 81);
});

test('parseOptions parses image options', () => {
  const parsed = parseOptions('a cat --size 2K --ratio 16:9 --return-base64');
  assert.equal(parsed.prompt, 'a cat');
  assert.equal(parsed.size, '2K');
  assert.equal(parsed.ratio, '16:9');
  assert.equal(parsed.returnBase64, true);
});

test('parseOptions parses repeated keyframes', () => {
  const parsed = parseOptions('animate -k k1.png -k k2.png');
  assert.equal(parsed.prompt, 'animate');
  assert.deepEqual(parsed.keyframes, ['k1.png', 'k2.png']);
});
