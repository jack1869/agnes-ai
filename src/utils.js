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
  if (data.video_id) {
    return `Video ID: ${data.video_id}\nStatus: ${data.status || 'queued'}`;
  }
  if (data.output?.[0]) {
    return data.output[0];
  }

  return JSON.stringify(data, null, 2);
}
