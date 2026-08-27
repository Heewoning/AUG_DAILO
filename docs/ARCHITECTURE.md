# AUG_DAILO architecture

## Product contract

The core loop is **내가 찍고 → 내가 말하고 → AI가 편집한다**.

`USER VOICE ONLY` is a product constraint. The app contains no generated script, TTS, synthetic voice, or voice-style picker. AI-related voice work is limited to live speech recognition, editable captions, and timeline sync.

## Runtime

AUG_DAILO is a React + TypeScript progressive web app. The same deployed URL runs in iPhone Safari, Galaxy Chrome, and desktop browsers. The manifest and service worker make the editor installable and cache the application shell.

The production build also emits a minimal OpenAI Sites Worker entrypoint. It delegates requests to the platform asset binding, so the same client build can run on OpenAI Sites and GitHub Pages.

## Modules

- `screens/`: Home, Create, Editor, Archive, and Profile surfaces.
- `components/Retro.tsx`: reusable, original Retro OS primitives. No Windows assets are copied.
- `services/mediaMetadata.ts`: video metadata and real thumbnail extraction from uploaded files.
- `services/analysis.ts`: `ClipAnalysisProvider` boundary and the current local metadata analyzer.
- `services/speech.ts`: `LiveTranscriber` boundary backed by browser Speech Recognition when available.
- `hooks/useVoiceRecorder.ts`: microphone permission, MediaRecorder lifecycle, user voice blob, and transcript.
- `services/storage.ts`: project metadata in localStorage and private video/audio blobs in IndexedDB.
- `services/videoExport.ts`: 9:16 compositor, clip audio, user narration mix, overlays, popup rendering, and export.

## Data safety

Original video and voice blobs stay in the browser's IndexedDB. No upload endpoint is used. Metadata is auto-saved after editor changes. If local quota is exhausted, the UI reports it without deleting source clips.

## Provider extension points

`ClipAnalysisProvider` can later be implemented by a server-side multimodal model. `LiveTranscriber` can later be implemented by a consent-aware streaming speech-to-text provider. Both return product-owned structured data; neither may synthesize a voice.

## Rendering roadmap

The current browser renderer produces MP4 when the browser exposes an MP4 MediaRecorder codec, otherwise WebM. A production worker can implement the same schema with FFmpeg for deterministic H.264/AAC, beat detection, phone-screen corner tracking, and resumable jobs.
