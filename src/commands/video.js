import { createVideo, pollVideo, checkVideoStatus } from '../api.js';
import { prepareMediaInput, extractUrl, downloadFile, validateVideoParams, readFileAsBase64 } from '../utils.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const TASKS_DIR = join(homedir(), '.agnes');
const TASKS_FILE = join(TASKS_DIR, 'video_tasks.json');

function ensureDir() {
  if (!existsSync(TASKS_DIR)) {
    mkdirSync(TASKS_DIR, { recursive: true });
  }
}

function readTasks() {
  try {
    if (!existsSync(TASKS_FILE)) return [];
    return JSON.parse(readFileSync(TASKS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveTask(videoId, prompt) {
  ensureDir();
  const tasks = readTasks();
  tasks.unshift({ videoId, prompt, createdAt: new Date().toISOString() });
  writeFileSync(TASKS_FILE, JSON.stringify(tasks.slice(0, 50), null, 2), 'utf-8');
}

export function listVideoTasks() {
  return readTasks();
}

export async function videoStatus(videoId, modelName) {
  return checkVideoStatus(videoId, modelName);
}

function resolveSingleImage(options) {
  const first = options.imageUrls?.[0] || options.imageFiles?.[0];
  return first ? prepareMediaInput(first) : undefined;
}

export async function videoCommand(prompt, options) {
  validateVideoParams(options);

  const model = options.model || 'agnes-video-v2.0';
  const result = await createVideo({
    prompt,
    model,
    width: options.width,
    height: options.height,
    num_frames: options.numFrames,
    frame_rate: options.frameRate,
    negative_prompt: options.negativePrompt,
    seed: options.seed,
    motion: options.motion,
    num_inference_steps: options.steps,
    image: resolveSingleImage(options),
    images: (options.keyframes || []).map(prepareMediaInput),
    videoFile: options.videoFile ? readFileAsBase64(options.videoFile) : undefined,
  });

  const videoId = result.video_id;
  if (!videoId) {
    return result;
  }

  saveTask(videoId, prompt);
  if (options.onCreated) options.onCreated(videoId);

  if (options.wait === false) {
    return result;
  }

  try {
    const final = await pollVideo(videoId, 3000, options.onProgress, 15000, model === 'agnes-video-v2.0' ? undefined : model);
    const url = extractUrl(final);
    if (options.output && url) {
      const saved = await downloadFile(url, options.output);
      return { ...final, savedTo: saved };
    }
    return final;
  } catch (err) {
    throw new Error(`[${videoId}] ${err.message}`);
  }
}
