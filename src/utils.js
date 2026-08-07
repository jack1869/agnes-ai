import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseSize(s) {
  if (!s) return null;
  const match = s.match(/^(\d+)x(\d+)$/);
  if (!match) {
    throw new Error(`Invalid size format: "${s}". Use WxH format, e.g. 1024x768`);
  }
  return { width: parseInt(match[1]), height: parseInt(match[2]) };
}

export function readFileAsBase64(filePath) {
  const fs = require('node:fs');
  const path = require('node:path');
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  const b64 = data.toString('base64');
  return `data:${mime};base64,${b64}`;
}

export function extractUrl(result) {
  if (!result) return '';
  return result.metadata?.url
    || result.video?.url
    || result.data?.[0]?.url
    || result.output?.[0]
    || result.url
    || result.video_url
    || result.download_url
    || '';
}

export function prepareMediaInput(value) {
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
  return readFileAsBase64(value);
}

export function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function downloadFile(url, outputPath) {
  const fs = require('node:fs');
  const path = require('node:path');
  const abs = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Download failed ${response.status}: ${err}`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(abs, buf);
  return abs;
}

export function saveBase64File(b64, outputPath) {
  const fs = require('node:fs');
  const path = require('node:path');
  const abs = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, Buffer.from(b64, 'base64'));
  return abs;
}

export function autoSavePath(kind, ext, name) {
  const path = require('node:path');
  const homedir = require('node:os').homedir;
  const dir = path.join(homedir(), 'agnes-outputs', kind);
  return path.join(dir, `${name}.${ext}`);
}

export function validateVideoParams({ width, height, numFrames, frameRate, motion } = {}) {
  if (width !== undefined && (!Number.isInteger(width) || width < 128 || width > 4096)) {
    throw new Error(`Invalid --width ${width}: must be an integer between 128 and 4096`);
  }
  if (height !== undefined && (!Number.isInteger(height) || height < 128 || height > 4096)) {
    throw new Error(`Invalid --height ${height}: must be an integer between 128 and 4096`);
  }
  if (numFrames !== undefined) {
    if (!Number.isInteger(numFrames) || numFrames < 1 || numFrames > 441 || (numFrames - 1) % 8 !== 0) {
      throw new Error(`Invalid --frames ${numFrames}: must satisfy 8n+1 (e.g. 9, 17, 25) and be <= 441`);
    }
  }
  if (frameRate !== undefined && (!Number.isInteger(frameRate) || frameRate < 1 || frameRate > 60)) {
    throw new Error(`Invalid --fps ${frameRate}: must be an integer between 1 and 60`);
  }
  if (motion !== undefined && (!Number.isInteger(motion) || motion < 0 || motion > 10)) {
    throw new Error(`Invalid --motion ${motion}: must be an integer between 0 and 10`);
  }
}

export function loadEnv() {
  const fs = require('node:fs');
  const path = require('node:path');
  const homedir = require('node:os').homedir;
  const files = [path.join(process.cwd(), '.env'), path.join(homedir(), '.agnes', '.env')];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  }
}

export function formatOutput(data, format = 'text') {
  if (typeof data === 'string') return data;

  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (data.savedTo) {
    const url = extractUrl(data) || '[generated data]';
    return `${url}\n[Saved] ${data.savedTo}`;
  }
  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }
  if (data.data?.[0]?.b64_json) {
    return '[base64 image data]';
  }
  if (extractUrl(data)) {
    return extractUrl(data);
  }
  if (data.video_id) {
    const parts = [`Video ID: ${data.video_id}`, `Status: ${data.status || 'queued'}`];
    if (data.seconds !== undefined) parts.push(`Seconds: ${data.seconds}`);
    if (data.size !== undefined) parts.push(`Size: ${data.size}`);
    return parts.join('\n');
  }
  if (data.output?.[0]) {
    return data.output[0];
  }

  return JSON.stringify(data, null, 2);
}
