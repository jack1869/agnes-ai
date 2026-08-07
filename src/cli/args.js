import chalk from 'chalk';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const VERSION = require('../../package.json').version;

export function help() {
  console.log(`
${chalk.bold('agnes')} - Agnes AI CLI Tool (text, image, video, prompt optimization)

  ${chalk.bold('USAGE')}
  agnes                           Interactive shell mode
  agnes <command> [options] <prompt>
  agnes --interactive             Force interactive mode

${chalk.bold('COMMANDS')}
  ${chalk.cyan('text')}       Generate text with agnes-2.5-flash
  ${chalk.cyan('image')}      Generate image with agnes-image-2.1-flash
  ${chalk.cyan('video')}      Generate video with agnes-video-v2.0
  ${chalk.cyan('video-status')}  Check video generation status by ID
  ${chalk.cyan('video-list')}    List recent video tasks
  ${chalk.cyan('optimize')}   Optimize a prompt for AI generation

${chalk.bold('GLOBAL OPTIONS')}
  --api-key <key>         Agnes API key (also via AGNES_API_KEY env or .env)
  --json                  Output raw JSON
  --interactive           Force interactive shell mode
  -v, --version           Show version
  -h, --help              Show this help

${chalk.bold('TEXT OPTIONS')}
  --system <text>         System prompt
  --temperature <n>       Sampling temperature (0-2)
  --top-p <n>             Top-p nucleus sampling (0-1)
  --thinking              Enable thinking mode (agnes-2.5-flash)
  --max-tokens <n>        Max tokens to generate
  --model <name>          Model name (default: agnes-2.5-flash; agnes-2.0-flash also supported)
  --stream                Stream the response
  --image-url <url>       Reference image URL for image understanding
  --image-file <path>     Local reference image for image understanding
  -i <path>               Shorthand for --image-file

${chalk.bold('IMAGE OPTIONS')}
  --size <WxH|1K|2K|3K|4K>  Image size: pixel WxH or tier (default: 1K)
  --ratio <R>             Aspect ratio: 1:1, 3:4, 4:3, 16:9, 9:16, 2:3, 3:2, 21:9
  --return-base64         Return base64 image data instead of a URL
  --model <name>          Model name (default: agnes-image-2.1-flash)
  --output <path>         Save the generated image to a file
  --image-file <path>     Reference image for img2img / multi-image composition
  -i <path>               Shorthand for --image-file
  --image-url <url>       Reference image URL for img2img / multi-image composition

${chalk.bold('VIDEO OPTIONS')}
  --width <px>            Video width (default: 1152)
  --height <px>           Video height (default: 768)
  --num-frames <n>        Number of frames (8n+1, max 441, default: 121 ≈ 5s)
  --frame-rate <n>        Frames per second (1-60, default: 24)
  --negative-prompt <t>   What to avoid in generation
  --seed <n>              Random seed for reproducibility
  --motion <n>            Motion intensity (0-10)
  --mode <mode>           Generation mode (ti2vid / keyframes)
  --steps <n>             Number of inference steps
  --output <path>         Save the generated video to a file
  --no-wait               Return immediately without polling
  --model <name>          Model name (default: agnes-video-v2.0)
  --image-file <path>     Reference image for img2vid generation
  -i <path>               Shorthand for --image-file
  --image-url <url>       Reference image URL for img2vid generation
  --keyframe <path|url>   Keyframe image for keyframe animation (repeatable)
  -k <path|url>           Shorthand for --keyframe
  --video-file <path>     Reference video for vid2vid generation
  -f <path>               Shorthand for --video-file

${chalk.bold('OPTIMIZE OPTIONS')}
  --for <type>            Target type: text, image, video (default: text)

${chalk.bold('EXAMPLES')}
  agnes                           Start interactive shell
  agnes text "Explain quantum computing in simple terms"
  agnes text --stream --system "You are a poet" "Write a poem about AI"
  agnes text --thinking "Plan a 3-step strategy"
  agnes text "What is in this image?" -i photo.png
  agnes image "A cat wearing a spacesuit on Mars" --size 2K --ratio 16:9 --output cat.png
  agnes image "Make it a cyberpunk style" -i input.jpg
  agnes image "Combine these two" -i a.png --image-url https://x/b.png
  agnes video "A drone flying over a futuristic city at sunset"
  agnes video "Make it move like this" -i style.png
  agnes video "Animate along these keyframes" -k k1.png -k k2.png -k k3.png
  agnes video "Extend this video" -f input.mp4
  agnes video-status <video_id>
  agnes optimize "a dog running" --for image
  agnes optimize "explain climate change" --for text
`);
}

export function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv[0] === '--interactive') {
    return null;
  }

  if (argv[0] === '--help' || argv[0] === '-h') {
    return { help: true };
  }

  if (argv[0] === '--version' || argv[0] === '-v') {
    return { version: true };
  }

  const command = argv[0];
  const validCommands = ['text', 'image', 'video', 'video-status', 'video-list', 'optimize'];
  if (!validCommands.includes(command)) {
    return { error: `Unknown command: ${command}` };
  }

  const options = {
    json: false,
    stream: false,
    wait: true,
  };

  let promptParts = [];

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--api-key':
        process.env.AGNES_API_KEY = argv[++i];
        break;
      case '--json':
        options.json = true;
        break;
      case '--system':
        options.system = argv[++i];
        break;
      case '--temperature':
        options.temperature = parseFloat(argv[++i]);
        break;
      case '--top-p':
      case '--top_p':
        options.topP = parseFloat(argv[++i]);
        break;
      case '--thinking':
        options.thinking = true;
        break;
      case '--max-tokens':
      case '--max-token':
        options.maxTokens = parseInt(argv[++i]);
        break;
      case '--model':
        options.model = argv[++i];
        break;
      case '--stream':
        options.stream = true;
        break;
      case '--size':
        options.size = argv[++i];
        break;
      case '--ratio':
        options.ratio = argv[++i];
        break;
      case '--return-base64':
      case '--return_base64':
        options.returnBase64 = true;
        break;
      case '--output':
        options.output = argv[++i];
        break;
      case '--width':
        options.width = parseInt(argv[++i]);
        break;
      case '--height':
        options.height = parseInt(argv[++i]);
        break;
      case '--num-frames':
      case '--num_frames':
      case '--frames':
        options.numFrames = parseInt(argv[++i]);
        break;
      case '--frame-rate':
      case '--frame_rate':
      case '--fps':
        options.frameRate = parseInt(argv[++i]);
        break;
      case '--negative-prompt':
      case '--negative_prompt':
      case '--neg':
        options.negativePrompt = argv[++i];
        break;
      case '--seed':
        options.seed = parseInt(argv[++i]);
        break;
      case '--motion':
        options.motion = parseInt(argv[++i]);
        break;
      case '--mode':
        options.mode = argv[++i];
        break;
      case '--steps':
      case '--num-inference-steps':
        options.steps = parseInt(argv[++i]);
        break;
      case '--keyframe':
      case '-k':
        options.keyframes ??= [];
        options.keyframes.push(argv[++i]);
        break;
      case '--no-wait':
      case '--no_wait':
        options.wait = false;
        break;
      case '--image-file':
      case '-i':
        options.imageFiles ??= [];
        options.imageFiles.push(argv[++i]);
        break;
      case '--image-url':
        options.imageUrls ??= [];
        options.imageUrls.push(argv[++i]);
        break;
      case '--video-file':
      case '-f':
        options.videoFile = argv[++i];
        break;
      case '--for':
        options.for = argv[++i];
        break;
      default:
        if (arg.startsWith('--')) {
          options.unknownOptions ??= [];
          options.unknownOptions.push(arg);
        } else {
          promptParts.push(arg);
        }
    }
  }

  const prompt = promptParts.join(' ');
  if (!prompt && command !== 'optimize' && command !== 'video-status' && command !== 'video-list') {
    return { error: `Error: <prompt> is required for "${command}" command` };
  }

  return { command, prompt, options };
}
