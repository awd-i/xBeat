# xBeat - AI-Powered DJ Application

A modern DJ application built with Next.js, featuring AI-powered track analysis, voice control, and real-time audio visualization.

## Features

- 🎵 **Dual Deck DJ Interface** - Mix tracks on two decks with full control
- 🤖 **AI-Powered Analysis** - Automatic track analysis using Grok AI (genre, BPM, key, mood, energy)
- 🎤 **Voice Control** - Control your DJ setup with voice commands via Grok AI
- 🎨 **3D Audio Visualizer** - Real-time Three.js audio visualization
- 📚 **Music Library** - Upload and manage your music collection
- 🎛️ **Advanced Mixer** - EQ, filters, effects (reverb, delay), crossfader
- 🌓 **Dark/Light Theme** - Beautiful UI with theme switching

## Prerequisites

- Node.js 18+ and pnpm installed
- XAI API key (for Grok AI features)
- Vercel Blob Storage token (for audio file storage)

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
XAI_API_KEY=your_xai_api_key_here
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

#### Getting Your API Keys

**XAI API Key:**
1. Visit https://console.x.ai/
2. Sign up or log in
3. Navigate to API keys section
4. Create a new API key
5. Copy the key to your `.env` file

**Vercel Blob Storage Token:**
1. Visit https://vercel.com/dashboard/stores
2. Create a new Blob store (or use existing)
3. Copy the `BLOB_READ_WRITE_TOKEN` from the store settings
4. Add it to your `.env` file

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Project Structure

```
xBeat/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── grok/         # Grok AI endpoints
│   │   └── tracks/       # Track management endpoints
│   └── page.tsx          # Main page
├── components/            # React components
│   ├── dj/               # DJ interface components
│   ├── grok/             # AI copilot components
│   ├── library/          # Music library components
│   ├── ui/               # UI component library
│   └── visualizer/       # Audio visualizer
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── audio-analyzer.ts # Audio analysis
│   ├── music-engine.ts   # Audio playback engine
│   └── music-store.ts    # Track storage
└── public/               # Static assets
```

## Tech Stack

- **Framework:** Next.js 16
- **UI:** React 19, Radix UI, Tailwind CSS
- **AI:** XAI (Grok) via @ai-sdk/xai
- **Audio:** Web Audio API, Three.js
- **Storage:** Vercel Blob Storage
- **Language:** TypeScript

## Features in Detail

### AI Track Analysis
Upload tracks and let Grok AI automatically analyze:
- Genre classification
- BPM detection
- Musical key identification
- Energy level (0-1)
- Mood assessment
- Descriptive tags

### Voice Control
Use natural language to control your DJ setup:
- "Increase the bass"
- "Fade to deck B"
- "Add some reverb"
- "What's playing on deck A?"

### Audio Visualization
Real-time 3D visualization powered by Three.js showing:
- Frequency spectrum
- Beat detection
- Energy levels
- Visual effects

## License

Private project - All rights reserved

