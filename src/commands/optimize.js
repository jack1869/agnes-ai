import { chatComplete } from '../api.js';

const SYSTEM_PROMPT = `You are a professional prompt engineer. Your task is to optimize user prompts for AI generation models.

Rules:
- 始终使用中文回复优化的提示词，除非用户明确要求使用英文
- Analyze the user's intent and expand with rich detail
- For text prompts: clarify context, tone, audience, and structure
- For image prompts: add details about style, lighting, composition, color palette, mood, and technical quality
- For video prompts: add cinematic direction, camera movement, scene transitions, lighting, atmosphere
- Keep the optimized prompt concise but vivid (under 500 words)
- Return ONLY the optimized prompt, no explanations`;

export async function optimizeCommand(prompt, options) {
  const target = options.for || 'text';
  const targetHint = {
    text: 'for text generation (clarify intent, tone, structure)',
    image: 'for image generation (add visual details, style, composition, lighting)',
    video: 'for video generation (add cinematic direction, motion, atmosphere)',
  };

  const userPrompt = `Optimize this prompt ${targetHint[target] || targetHint.text}:\n\n${prompt}`;

  const result = await chatComplete({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    model: 'agnes-2.0-flash',
    temperature: 0.7,
    max_tokens: 1024,
  });

  return result;
}
