import { chatComplete } from '../api.js';
import { readFileAsBase64 } from '../utils.js';

export async function textCommand(prompt, options) {
  const existing = options.messages || [];

  const imageUrls = [
    ...(options.imageUrls || []),
    ...(options.imageFiles || []).map(readFileAsBase64),
  ];

  let userContent = prompt;
  if (imageUrls.length > 0) {
    userContent = [
      { type: 'text', text: prompt },
      ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
  }

  let messages;
  if (existing.length > 0) {
    messages = [...existing, { role: 'user', content: userContent }];
  } else if (options.system) {
    messages = [{ role: 'system', content: options.system }, { role: 'user', content: userContent }];
  } else {
    messages = [{ role: 'user', content: userContent }];
  }

  const result = await chatComplete({
    messages,
    model: options.model || 'agnes-2.5-flash',
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    top_p: options.topP,
    thinking: options.thinking,
    stream: options.stream,
  });

  if (options.stream) {
    const reader = result.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let firstChunk = true;
    const writeFn = options.writeFn || ((s) => process.stdout.write(s));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (firstChunk && content) {
            firstChunk = false;
            options.onFirstChunk?.();
          }
          writeFn(content);
          fullContent += content;
        } catch { /* skip malformed chunks */ }
      }
    }
    writeFn('\n');
    return fullContent;
  }

  return result;
}
