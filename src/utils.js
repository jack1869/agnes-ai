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

export function formatOutput(data, format = 'text') {
  if (typeof data === 'string') return data;

  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }
  if (data.data?.[0]?.b64_json) {
    return '[base64 image data]';
  }
  if (data.video?.url) {
    return data.video.url;
  }
  if (data.video_id) {
    return `Video ID: ${data.video_id}\nStatus: ${data.status || 'queued'}`;
  }
  if (data.output?.[0]) {
    return data.output[0];
  }

  return JSON.stringify(data, null, 2);
}
