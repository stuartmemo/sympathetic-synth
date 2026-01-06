Sympathetic Synthesizer System Mk1
==================================

A synthesizer created using the Web Audio API, now with AI-powered sound design.

## Features

- 3 oscillators with selectable waveforms (triangle, sawtooth, square)
- ADSR envelope for volume
- ADSR envelope for filter
- Low-pass filter with cutoff and resonance controls
- Noise generator
- MIDI input support
- Virtual keyboard (qwerty-hancock)
- **AI Sound Designer** - Describe the sound you want in plain English and the AI will adjust the synth settings

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Anthropic API key (for AI features)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your Anthropic API key:
```bash
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

3. Start the development server:
```bash
npm run dev
```

The synth will open at http://localhost:3000

## Using the AI Sound Designer

The AI Sound Designer panel lets you describe sounds in natural language. Try prompts like:

- "Create a warm pad with slow attack"
- "Make a punchy bass sound"
- "I want a bright, aggressive lead"
- "Give me an ambient texture with some noise"
- "Classic 80s synth brass sound"

The AI will analyze your description and adjust the oscillators, filters, and envelopes to create the sound you described.

## Development

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts   # AI chat API endpoint
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page
├── components/
│   ├── chat-panel.tsx      # AI chat interface
│   └── synth-panel.tsx     # Synth controls and keyboard
├── lib/audio/
│   ├── audio-engine.ts     # Web Audio API wrapper
│   ├── envelope.ts         # ADSR envelope generator
│   ├── synth.ts            # Main synthesizer class
│   └── index.ts            # Audio module exports
└── types/
    └── qwerty-hancock.d.ts # Type definitions
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Vercel AI SDK** - AI integration with streaming
- **Anthropic Claude** - AI model for sound design
- **Web Audio API** - Audio synthesis
- **qwerty-hancock** - Virtual keyboard

## License

MIT
