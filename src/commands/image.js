import { generateImage } from '../api.js';

export async function imageCommand(prompt, options) {
  const data = await generateImage({
    prompt,
    model: options.model || 'agnes-image-2.1-flash',
    size: options.size || '1024x1024',
  });

  return data;
}
