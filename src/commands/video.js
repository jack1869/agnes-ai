import { createVideo, pollVideo } from '../api.js';
import { sleep } from '../utils.js';

export async function videoCommand(prompt, options) {
  const result = await createVideo({
    prompt,
    model: options.model || 'agnes-video-v2.0',
    width: options.width,
    height: options.height,
    num_frames: options.numFrames,
    frame_rate: options.frameRate,
    negative_prompt: options.negativePrompt,
    seed: options.seed,
  });

  const videoId = result.video_id;
  if (!videoId) {
    return result;
  }

  if (options.wait === false) {
    return result;
  }

  const final = await pollVideo(videoId, 3000, (data) => {
    if (data.progress !== undefined) {
      process.stdout.write(`\rProgress: ${data.progress}%`);
    }
  });

  process.stdout.write('\n');
  return final;
}
