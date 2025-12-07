# xBeat - AI-Powered DJ System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

An intelligent DJ application powered by Grok AI that enables voice-controlled mixing, automated transitions, and real-time audio visualization.

## What is xBeat?

xBeat is a cutting-edge web-based DJ system that combines professional audio mixing capabilities with AI assistance. Talk to Grok using natural language to control your mix, create smooth transitions, and let AI handle complex DJ operations while you focus on creativity.

## Features

### 🎤 Voice-Powered AI DJ Assistant
- **Natural Language Control**: Talk to Grok to control the entire DJ setup
- **Voice Commands**: "Mix these tracks smoothly", "Drop the bass", "Transition to deck B"
- **Speech Recognition**: Real-time voice input with visual feedback
- **Text-to-Speech**: Grok speaks responses using multiple voice options (Ara, Eve, Rex, Leo)
- **Auto-Mute**: Automatically mutes after first response for seamless workflow

### 🎛️ Professional DJ Controls
- **Dual Deck System**: Load and control two tracks independently
- **Advanced Mixer**:
  - Crossfader for smooth transitions
  - 3-band EQ (Low, Mid, High) per deck
  - Filter controls (lowpass/highpass)
  - Reverb and Delay effects
  - Master gain control
- **BPM Detection**: Automatic tempo detection for beatmatching
- **Tempo Control**: Adjust playback rate for manual beatmatching
- **Audio Isolation**: Separate bass, voice, and melody frequencies

### 🤖 AI-Powered Features
- **Automated Transitions**: AI-generated crossfades with EQ and effects automation
- **Track Analysis**: Automatic genre, mood, energy, and key detection
- **Smart Recommendations**: AI suggests compatible tracks for mixing
- **Preset Generation**: Grok creates custom mixer presets on demand

### 🎨 Real-Time 3D Visualization
- **Multiple Modes**: Cymatic, Particles, Tunnel, Waveform
- **Audio-Reactive**: Responds to frequency analysis in real-time
- **Color Schemes**: Multiple visual themes
- **Full-Screen Support**: Immersive visual experience

### 📚 Music Library Management
- **Track Upload**: Drag-and-drop audio file support (MP3, WAV, OGG, etc.)
- **Vercel Blob Storage**: Cloud-based audio file hosting
- **Track Metadata**: Title, artist, BPM, key, genre, mood, energy
- **Quick Loading**: One-click track loading to either deck

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Pre-built component library
- **Three.js** - 3D graphics and visualizations
- **React Three Fiber** - React renderer for Three.js

### Audio Engine
- **Web Audio API** - Professional-grade audio processing
- **Custom Music Engine** - Dual-deck audio system with:
  - Real-time audio analysis
  - BPM detection
  - EQ and filtering
  - Effects processing (reverb, delay)
  - Audio isolation (bass, voice, melody)

### AI Integration
- **Grok API (xAI)** - AI-powered DJ assistant
- **Vercel AI SDK** - Streaming AI responses
- **Speech Recognition API** - Voice input
- **Text-to-Speech** - Voice output with multiple personas

### Backend & Storage
- **Next.js API Routes** - Serverless API endpoints
- **Vercel Blob** - Cloud file storage
- **SWR** - Data fetching and caching

### Development Tools
- **Turbopack** - Fast build system
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## Getting Started

### Prerequisites
- Node.js 18+ or npm/pnpm
- Vercel account (for blob storage)
- xAI API key (for Grok features)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/awd-i/xBeat.git
cd xBeat
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:
```env
XAI_API_KEY=your_xai_api_key_here
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:3000
```

## How to Use

### Basic Workflow

1. **Upload Music**
   - Click on the Library panel (left side)
   - Upload audio files using the upload button
   - Wait for files to process and appear in your library

2. **Load Tracks**
   - Click a track in the library
   - Select "Load to Deck A" or "Load to Deck B"
   - Tracks will appear in the deck controls

3. **Using Voice Control**
   - Click the **Grok AI Chat** tab at the bottom
   - Click the large microphone icon or say "Speak here"
   - Give voice commands like:
     - "Play both decks"
     - "Increase the bass on deck A"
     - "Create a smooth transition to deck B"
     - "Drop the filter"
     - "Add some reverb"

4. **Manual DJ Controls**
   - Switch to **DJ Controls** tab
   - Use the mixer to adjust:
     - Crossfader position
     - EQ levels (bass, mid, treble)
     - Filter cutoff
     - Effect amounts
   - Control individual decks:
     - Play/pause
     - Seek position
     - Adjust gain
     - Change tempo

5. **AI Transitions**
   - Load tracks on both decks
   - Tell Grok: "Transition from A to B" or "Mix into deck B"
   - Grok creates an automated transition with:
     - Smooth crossfade
     - EQ adjustments
     - Tempo matching
     - Effect automation

### Voice Commands Examples

- **Playback**: "Play deck A", "Pause both decks", "Stop"
- **Mixing**: "Fade to deck B", "Crossfade to A", "Mix smoothly"
- **EQ**: "Boost the bass", "Cut the highs", "More treble on B"
- **Effects**: "Add reverb", "Drop the filter", "Echo on deck A"
- **Transitions**: "Blend into deck B", "Smooth transition", "Create a mix"
- **Track Loading**: "Load [track name] to deck A"

### Keyboard Shortcuts

- **Expand/Collapse Controls**: Click arrow button above bottom panel
- **Switch Panels**: Click "Grok AI Chat" or "DJ Controls" tabs

## Project Structure

```
xBeat/
├── app/
│   ├── api/
│   │   ├── grok/          # AI endpoints
│   │   │   ├── analyze/   # Track analysis
│   │   │   ├── preset/    # Preset generation
│   │   │   ├── recommend/ # Track recommendations
│   │   │   ├── speak/     # Text-to-speech
│   │   │   ├── transition/# Transition planning
│   │   │   └── voice/     # Voice command processing
│   │   └── tracks/        # Track management
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx           # Main DJ interface
├── components/
│   ├── dj/
│   │   ├── deck.tsx       # DJ deck component
│   │   ├── mixer.tsx      # Mixer controls
│   │   └── visualizer-controls.tsx
│   ├── grok/
│   │   ├── grok-chat-panel.tsx      # Unified AI chat
│   │   ├── grok-copilot.tsx         # Legacy copilot
│   │   ├── transition-status.tsx    # Transition UI
│   │   └── voice-control.tsx        # Legacy voice
│   ├── library/
│   │   └── music-library.tsx        # Track library
│   ├── visualizer/
│   │   └── three-visualizer.tsx     # 3D visualization
│   └── ui/                           # shadcn components
├── hooks/
│   ├── use-music-engine.ts          # Audio engine hook
│   ├── use-tracks.ts                # Track management
│   └── use-voice-commands.ts        # Voice recognition
├── lib/
│   ├── audio-analyzer.ts            # Frequency analysis
│   ├── bpm-detector.ts              # Tempo detection
│   ├── music-engine.ts              # Core audio engine
│   ├── music-store.ts               # Track storage
│   ├── types.ts                     # TypeScript types
│   └── utils.ts                     # Utilities
└── public/                           # Static assets
```

## API Endpoints

### Grok AI Endpoints
- `POST /api/grok/voice` - Process voice commands
- `POST /api/grok/analyze` - Analyze track metadata
- `POST /api/grok/transition` - Generate transition plan
- `POST /api/grok/preset` - Create mixer preset
- `POST /api/grok/recommend` - Get track recommendations
- `POST /api/grok/speak` - Text-to-speech synthesis

### Track Management
- `GET /api/tracks` - List all tracks
- `POST /api/tracks/upload` - Upload new track
- `PATCH /api/tracks/[id]` - Update track metadata
- `DELETE /api/tracks` - Delete track

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `XAI_API_KEY` | xAI API key for Grok | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | Yes |

### Audio Settings

The music engine supports:
- **Sample Rate**: 44.1kHz / 48kHz
- **Bit Depth**: 16-bit / 24-bit
- **Formats**: MP3, WAV, OGG, AAC, FLAC, M4A
- **Max File Size**: 50MB per track

## Development

### Running Locally
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Branch Structure
- `main` - Stable production code
- `experimentalui` - Experimental UI features

## Deployment

This project is configured for deployment on Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [xAI Grok](https://x.ai/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- 3D graphics with [Three.js](https://threejs.org/)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Made with ❤️ for DJs and music enthusiasts**
