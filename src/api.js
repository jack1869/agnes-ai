import { fetchWithTimeout } from './utils.js';

const BASE_URL = 'https://api.agnes-ai.cn/v1';
const STATUS_URL = 'https://api.agnes-ai.cn/agnesapi';

function getApiKey() {
  const key = process.env.AGNES_API_KEY;
  if (!key) {
    throw new Error('AGNES_API_KEY environment variable is required. Set it or pass --api-key');
  }
  return key;
}

function headers(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function describeError(label, status, body) {
  if (status === 401) {
    return `${label} error 401: Invalid or missing API key. Check AGNES_API_KEY or --api-key.`;
  }
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return `${label} error ${status}: ${text}`;
}

export async function chatComplete({ messages, model = 'agnes-2.5-flash', temperature, max_tokens, top_p, thinking, stream = false }) {
  const key = getApiKey();
  const body = { model, messages, stream };
  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;
  if (top_p !== undefined) body.top_p = top_p;
  if (thinking) body.chat_template_kwargs = { enable_thinking: true };

  const response = await fetchWithTimeout(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(describeError('Chat API', response.status, err));
  }

  if (stream) {
    return response.body;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateImage({ prompt, size = '1K', ratio, model = 'agnes-image-2.1-flash', images = [], returnBase64 = false, responseFormat }) {
  const key = getApiKey();
  const body = { model, prompt, size };
  if (ratio) body.ratio = ratio;
  if (returnBase64) body.return_base64 = true;
  const extra = {};
  if (images.length > 0) extra.image = images;
  if (responseFormat) extra.response_format = responseFormat;
  if (Object.keys(extra).length > 0) body.extra_body = extra;

  const response = await fetchWithTimeout(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(body),
  }, 300000);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(describeError('Image API', response.status, err));
  }

  return response.json();
}

export async function createVideo({ prompt, model = 'agnes-video-v2.0', width, height, num_frames, frame_rate, negative_prompt, seed, motion, num_inference_steps, image, images = [], videoFile }) {
  const key = getApiKey();
  const body = { model, prompt };
  if (width !== undefined) body.width = width;
  if (height !== undefined) body.height = height;
  if (num_frames !== undefined) body.num_frames = num_frames;
  if (frame_rate !== undefined) body.frame_rate = frame_rate;
  if (negative_prompt !== undefined) body.negative_prompt = negative_prompt;
  if (seed !== undefined) body.seed = seed;
  if (motion !== undefined) body.motion = motion;
  if (num_inference_steps !== undefined) body.num_inference_steps = num_inference_steps;
  if (image !== undefined) body.image = image;
  if (videoFile) body.video = videoFile;
  if (images.length > 0) {
    body.extra_body = { image: images, mode: 'keyframes' };
  }

  const maxRetries = 10;
  let interval = 5000;
  const maxInterval = 60000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetchWithTimeout(`${BASE_URL}/videos`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response.json();
    }

    const err = await response.text();

    if ((response.status === 502 || response.status === 503) && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, interval));
      interval = Math.min(interval * 2, maxInterval);
      continue;
    }

    throw new Error(describeError('Video API', response.status, err));
  }
}

export async function checkVideoStatus(videoId, modelName) {
  const key = getApiKey();
  const url = `${STATUS_URL}?video_id=${videoId}${modelName ? `&model_name=${encodeURIComponent(modelName)}` : ''}`;
  const response = await fetchWithTimeout(url, {
    headers: headers(key),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(describeError('Video status', response.status, err));
  }
  return response.json();
}

export async function pollVideo(videoId, initialInterval = 3000, onProgress, maxInterval = 15000, modelName) {
  const key = getApiKey();
  let interval = initialInterval;
  let retries = 0;
  const maxRetries = 30;

  while (true) {
    try {
      const url = `${STATUS_URL}?video_id=${videoId}${modelName ? `&model_name=${encodeURIComponent(modelName)}` : ''}`;
      const response = await fetchWithTimeout(url, {
        headers: headers(key),
      });

      if (response.status === 503 && retries < maxRetries) {
        retries++;
        await new Promise(r => setTimeout(r, interval));
        interval = Math.min(interval * 2, maxInterval);
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        throw new Error(describeError('Video poll', response.status, err));
      }

      retries = 0;
      const data = await response.json();

      if (onProgress) onProgress(data);

      if (data.status === 'completed' || data.status === 'succeeded') {
        return data;
      }
      if (data.status === 'failed') {
        throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
      }

      await new Promise(r => setTimeout(r, interval));
      interval = Math.min(interval * 2, maxInterval);
    } catch (err) {
      if (err.message?.startsWith('Video poll error') && retries < maxRetries) {
        retries++;
        await new Promise(r => setTimeout(r, interval));
        interval = Math.min(interval * 2, maxInterval);
        continue;
      }
      throw err;
    }
  }
}
