import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSize, formatOutput, validateVideoParams, extractUrl } from '../src/utils.js';

test('parseSize accepts WxH', () => {
  assert.deepEqual(parseSize('1024x768'), { width: 1024, height: 768 });
});

test('parseSize returns null for empty input', () => {
  assert.equal(parseSize(''), null);
  assert.equal(parseSize(undefined), null);
});

test('parseSize rejects bad formats', () => {
  assert.throws(() => parseSize('1024'), /Invalid size format/);
  assert.throws(() => parseSize('abc'), /Invalid size format/);
  assert.throws(() => parseSize('1024x'), /Invalid size format/);
});

test('formatOutput passes strings through', () => {
  assert.equal(formatOutput('hello'), 'hello');
});

test('formatOutput extracts image url', () => {
  const data = { data: [{ url: 'https://x/y.png' }] };
  assert.equal(formatOutput(data), 'https://x/y.png');
});

test('formatOutput reports savedTo', () => {
  const data = { data: [{ url: 'https://x/y.png' }], savedTo: '/tmp/y.png' };
  const out = formatOutput(data);
  assert.match(out, /https:\/\/x\/y\.png/);
  assert.match(out, /\[Saved\] \/tmp\/y\.png/);
});

test('formatOutput handles video ids', () => {
  const out = formatOutput({ video_id: 'video_1', status: 'queued' });
  assert.match(out, /video_1/);
});

test('formatOutput json mode returns full json', () => {
  const data = { data: [{ url: 'u' }] };
  const parsed = JSON.parse(formatOutput(data, 'json'));
  assert.equal(parsed.data[0].url, 'u');
});

test('extractUrl prefers metadata.url for videos', () => {
  const result = { metadata: { url: 'https://cdn/v.mp4' }, data: [{ url: 'https://other/x' }] };
  assert.equal(extractUrl(result), 'https://cdn/v.mp4');
});

test('extractUrl falls back to legacy video fields', () => {
  assert.equal(extractUrl({ video: { url: 'https://v.mp4' } }), 'https://v.mp4');
  assert.equal(extractUrl({ video_url: 'https://vu.mp4' }), 'https://vu.mp4');
  assert.equal(extractUrl({ url: 'https://u.mp4' }), 'https://u.mp4');
  assert.equal(extractUrl({ download_url: 'https://d.mp4' }), 'https://d.mp4');
  assert.equal(extractUrl({}), '');
});

test('formatOutput extracts completed video from metadata.url', () => {
  const out = formatOutput({ metadata: { url: 'https://cdn/v.mp4' }, status: 'completed' });
  assert.equal(out, 'https://cdn/v.mp4');
});

test('formatOutput video id shows seconds and size', () => {
  const out = formatOutput({ video_id: 'v1', status: 'in_progress', seconds: '5.0', size: '1152x768' });
  assert.match(out, /v1/);
  assert.match(out, /5\.0/);
  assert.match(out, /1152x768/);
});

test('validateVideoParams accepts valid values', () => {
  assert.doesNotThrow(() => validateVideoParams({ width: 1920, height: 1080, numFrames: 81, frameRate: 30, motion: 1 }));
});

test('validateVideoParams rejects invalid frames (not 8n+1)', () => {
  assert.throws(() => validateVideoParams({ numFrames: 80 }), /8n\+1/);
  assert.throws(() => validateVideoParams({ numFrames: 442 }), /8n\+1/);
});

test('validateVideoParams rejects bad width/height/fps/motion', () => {
  assert.throws(() => validateVideoParams({ width: 10 }), /--width/);
  assert.throws(() => validateVideoParams({ height: 99999 }), /--height/);
  assert.throws(() => validateVideoParams({ frameRate: 0 }), /--fps/);
  assert.throws(() => validateVideoParams({ motion: 11 }), /--motion/);
});
