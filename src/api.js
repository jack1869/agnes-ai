const BASE_URL = 'https://apihub.agnes-ai.com/v1';

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

export async function chatComplete({ messages, model = 'agnes-2.0-flash', temperature, max_tokens, stream = false }) {
  const key = getApiKey();
  const body = { model, messages, stream };
  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Chat API error ${response.status}: ${err}`);
  }

  if (stream) {
    return response.body;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateImage({ prompt, size = '1024x1024', model = 'agnes-image-2.1-flash', output }) {
  const key = getApiKey();
  const body = { model, prompt, size };

  const response = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Image API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data;
}

export async function createVideo({ prompt, model = 'agnes-video-v2.0', width, height, num_frames, frame_rate, negative_prompt, seed }) {
  const key = getApiKey();
  const body = { model, prompt };
  if (width) body.width = width;
  if (height) body.height = height;
  if (num_frames) body.num_frames = num_frames;
  if (frame_rate) body.frame_rate = frame_rate;
  if (negative_prompt) body.negative_prompt = negative_prompt;
  if (seed !== undefined) body.seed = seed;

  const response = await fetch(`${BASE_URL}/videos`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Video API error ${response.status}: ${err}`);
  }

  return response.json();
}

export async function pollVideo(videoId, interval = 3000, onProgress) {
  const key = getApiKey();

  while (true) {
    const response = await fetch(`${BASE_URL.replace('/v1', '')}/agnesapi?video_id=${videoId}`, {
      headers: headers(key),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Video poll error ${response.status}: ${err}`);
    }

    const data = await response.json();

    if (onProgress) onProgress(data);

    if (data.status === 'completed' || data.status === 'succeeded') {
      return data;
    }
    if (data.status === 'failed') {
      throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
    }

    await new Promise(r => setTimeout(r, interval));
  }
}
