# VoiceVision Assistant — Design Spec

## Overview
Web-based PWA that helps blind/visually impaired users interact with their environment through voice commands and AI-powered visual recognition. Captures camera frames, processes via Google Cloud Vision API, responds with ElevenLabs TTS.

## Architecture

Single-page Next.js 14 app (App Router, TypeScript, Tailwind CSS). Three modules:

### 1. Voice Commander
- Web Speech API (`SpeechRecognition`)
- Always-listening after page load
- Recognized commands: "read this", "what do you see", "describe this", "stop"
- Audio cues (short tones) for state transitions: listening, processing, error

### 2. Camera Module
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Live video feed rendered to `<video>` element (visible but not primary UI)
- Frame capture: draw current frame to offscreen `<canvas>`, export as base64 JPEG
- No shutter button — triggered by voice command

### 3. Vision Processor (Server-side API Route)
- `POST /api/vision` — receives base64 image
- Calls Google Cloud Vision API with features:
  - `TEXT_DETECTION` for OCR
  - `LABEL_DETECTION` for object/scene identification
  - `OBJECT_LOCALIZATION` for specific object detection
- Returns structured response: `{ text: string, labels: string[], objects: string[], description: string }`
- Composes natural language description from results

### 4. Response Engine
- `POST /api/tts` — receives text, returns ElevenLabs audio stream
- Client plays audio via `<audio>` element or AudioContext
- Fallback: browser `SpeechSynthesis` API if ElevenLabs fails
- After playback completes, re-activates voice listener

## Data Flow
```
Voice Command → Capture Frame → /api/vision → Compose Description → /api/tts → Play Audio → Listen Again
```

## UI Design
- **Full-screen camera feed** as background (subtle, low opacity for sighted helpers)
- **Large centered status text**: "Listening...", "Processing...", "Speaking..."
- **High contrast**: dark background, white text, large font
- **Pulsing indicator** for listening state
- **No buttons required** — entirely voice-driven
- **Single tap anywhere** as alternative trigger (accessibility)

## API Keys (Environment Variables)
- `GOOGLE_CLOUD_VISION_API_KEY` — Google Cloud Vision
- `ELEVENLABS_API_KEY` — ElevenLabs TTS
- `ELEVENLABS_VOICE_ID` — Selected voice (default: "Rachel")

## File Structure
```
voicevision/
├── app/
│   ├── layout.tsx          # Root layout, metadata, PWA manifest link
│   ├── page.tsx            # Main app page
│   ├── globals.css         # Tailwind + custom styles
│   └── api/
│       ├── vision/route.ts # Google Cloud Vision proxy
│       └── tts/route.ts    # ElevenLabs TTS proxy
├── components/
│   ├── VoiceVision.tsx     # Main orchestrator component
│   ├── CameraFeed.tsx      # Camera video + frame capture
│   ├── VoiceListener.tsx   # Speech recognition hook
│   ├── StatusDisplay.tsx   # Visual status indicator
│   └── AudioPlayer.tsx     # TTS audio playback
├── hooks/
│   ├── useVoiceRecognition.ts
│   ├── useCamera.ts
│   └── useAudioPlayer.ts
├── lib/
│   ├── vision.ts           # Vision API client
│   ├── tts.ts              # ElevenLabs client
│   └── commands.ts         # Command parsing
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sounds/             # UI feedback sounds
├── .env.local              # API keys
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Error Handling
- Camera permission denied → voice prompt to enable
- No internet → fallback to browser TTS, show offline indicator
- Vision API error → retry once, then apologize via TTS
- Speech recognition unsupported → show tap-to-speak fallback

## Performance Targets
- Voice command to audio response: <4 seconds
- Camera frame capture: <100ms
- Vision API round-trip: <2 seconds
- TTS generation: <1.5 seconds (streaming)

## PWA Features
- Installable on Android home screen
- Service worker for offline shell
- Full-screen mode (no browser chrome)
