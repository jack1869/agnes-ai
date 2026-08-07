import { generateImage } from '../api.js';
import { readFileAsBase64, downloadFile, saveBase64File } from '../utils.js';

export async function imageCommand(prompt, options) {
  const images = options.images
    || [...(options.imageUrls || []), ...(options.imageFiles || []).map(readFileAsBase64)];

  const data = await generateImage({
    prompt,
    model: options.model || 'agnes-image-2.1-flash',
    size: options.size || '1K',
    ratio: options.ratio,
    images,
    returnBase64: options.returnBase64,
    responseFormat: options.responseFormat,
  });

  if (!options.output) return data;

  const item = data.data?.[0];
  if (!item) return data;

  let saved;
  if (item.url) {
    saved = await downloadFile(item.url, options.output);
  } else if (item.b64_json) {
    saved = saveBase64File(item.b64_json, options.output);
  }

  if (saved) return { ...data, savedTo: saved };
  return data;
}
