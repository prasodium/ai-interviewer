# AI Interviewer

A desktop app for practicing job interviews with an AI interviewer. Pick a role,
upload your resume, and do a spoken mock interview - the AI asks one question at
a time, adapts to your answers, and gives you a scored report at the end.

## What it does

1. You select a job role, experience level, interview type, difficulty, style,
   and length, and upload a resume (PDF).
2. The app reads your resume locally and extracts skills, experience, projects,
   education, and certifications.
3. You start a voice interview. The AI interviewer speaks one question at a
   time in a natural voice, using your resume and the job description (if
   provided) to guide topics.
4. You just talk - the mic listens automatically after each question and
   stops when you go quiet, no click-to-talk needed (typing is available as
   a fallback). The AI evaluates each answer, asks follow-up questions on
   vague or interesting answers, and adapts difficulty as you go. The full
   conversation is shown as text alongside the interview.
5. When the interview ends, you get a full report: scores, strengths,
   weaknesses, a question-by-question breakdown, and suggested next steps.
6. Past interviews are saved locally so you can track progress over time.

## Features

- Resume-aware, adaptive interview questions (not a generic chatbot)
- Hands-free voice interviews: the mic listens automatically after each
  question and stops when you go quiet, with a natural AI voice (OpenAI TTS)
  asking the questions - no click-to-talk button needed
- A live text transcript of the conversation alongside the voice interview
- Automatic text-input fallback when voice recording isn't available
- Local SQLite storage for interview history - resumes and transcripts never
  leave your machine except to OpenAI, for generating questions/feedback/voice
- API keys are encrypted at rest via the OS keychain (Electron `safeStorage`)

The entire pipeline - interview questions, evaluation, speech-to-text, and
text-to-speech - runs on the OpenAI API. An API key is required; there is no
offline or mock mode.

## Technology

- **Desktop shell:** Electron
- **Frontend:** React + TypeScript + Vite (via `electron-vite`)
- **Backend:** Node.js running in the Electron main process, reached from the
  renderer only through a typed IPC bridge (no direct filesystem/network
  access from the UI, and the OpenAI key never touches renderer code)
- **Database:** SQLite (`better-sqlite3`)
- **AI:** OpenAI API (`gpt-4o-mini` for interview logic, Whisper for
  speech-to-text, TTS for voice output) - behind a small `InterviewAI`
  interface so a different provider could be swapped in later
- **Resume parsing:** `pdf-parse`, entirely on-device
- **Voice:** OpenAI Whisper (speech-to-text) and TTS (text-to-speech) - see
  "Voice" below for why

## Voice

Electron's bundled Chromium does not actually implement the browser's
`SpeechRecognition` API - it depends on a private Google backend that only
official Chrome ships credentials for, so it fails silently in every
Electron app. Voice input therefore records raw microphone audio
(`getUserMedia` + `MediaRecorder`, which works fine in Electron) and sends
it to OpenAI's Whisper model for transcription. Voice output uses OpenAI's
TTS voices, which sound noticeably more natural than the OS's built-in
`SpeechSynthesis` voices.

Both require a real OpenAI API key (configured in Settings) - there is no
offline fallback. Recording stops automatically a few seconds after you go
quiet, so no button needs to be clicked to end an answer. The app also
checks whether a recording ever crossed a speech-volume threshold before
sending it to Whisper at all, and whether a transcribed answer just echoes
the question back - both are safety nets against acoustic feedback and
Whisper's tendency to hallucinate stock phrases ("Thank you for watching!")
when fed silence.

## Project structure

```
src/
  main/            Electron main process
    backend/
      ai/          InterviewAI interface + the OpenAI implementation, speech (Whisper/TTS)
      resume/      PDF text extraction, resume/job-description analysis
      interview/   Interview state machine, scoring
      database/    SQLite access
    services/      Settings storage, logging
    ipc.ts         All IPC handlers registered here
    window.ts      BrowserWindow creation
    index.ts       App bootstrap
  preload/         contextBridge - the only bridge into the renderer
  renderer/        React app (pages, components, hooks, services)
  shared/          Types and constants used by both processes
tests/             Vitest tests for the logic in src/main
```

## Installation

Requires Node.js 20+ and npm.

```bash
npm install
```

## Development

```bash
cp .env.example .env
# edit .env and add your OPENAI_API_KEY
npm run dev
```

An OpenAI API key is required to do anything AI-related - there is no mock
mode. Without one, the app still opens and you can browse settings/history,
but starting an interview will prompt you to add a key.

## Environment variables

Set these in `.env` during development (see `.env.example`):

| Variable          | Description                                             |
| ----------------- | -------------------------------------------------------- |
| `OPENAI_API_KEY`  | Your OpenAI API key. Required.                          |
| `OPENAI_MODEL`    | Model used for interview questions/evaluation. Default: `gpt-4o-mini`. |

In the packaged app, the API key is instead entered in **Settings** and stored
encrypted on disk - `.env` is only used for local development.

## Configuring OpenAI

1. Get an API key from https://platform.openai.com.
2. Either put it in `.env` as `OPENAI_API_KEY` (development), or open the
   app's **Settings** page and paste it there (works in both dev and the
   packaged app, and is what end users should do).

## Testing

```bash
npm run typecheck
npm test
```

Tests run through Electron's own Node binary (`ELECTRON_RUN_AS_NODE=1`)
because `better-sqlite3` is compiled specifically for Electron's ABI - a
plain Node test runner would hit a `NODE_MODULE_VERSION` mismatch.

## Prebuilt downloads

Prebuilt installers (macOS `.dmg` and Windows `.exe`) are published on the
[Releases page](../../releases). Neither is code-signed yet, so macOS will
warn about an unidentified developer (right-click the app → **Open** once)
and Windows SmartScreen will warn about an unrecognized publisher (**More
info → Run anyway**).

After installing, open **Settings** and paste in your own OpenAI API key -
it's saved encrypted on your device and stays active every time you open
the app until you change or remove it. A key is required to run interviews.

## Building for macOS / Windows

```bash
npm run build:mac   # produces a .dmg in release/
npm run build:win   # produces an NSIS .exe installer in release/
```

Custom app icons aren't included yet - drop `icon.icns` / `icon.ico` into
`resources/` and reference them in `electron-builder.yml` to brand the build.

## Troubleshooting

- **"We couldn't connect to the AI service"** - check your internet
  connection and that `OPENAI_API_KEY` / the Settings API key is valid.
- **Voice input falls back to typing** - this happens automatically when no
  API key is configured, in an environment without microphone recording
  support, or if microphone permission was denied. On macOS, check System
  Settings → Privacy & Security → Microphone if the app isn't listed or is
  unchecked (note: running via `npm run dev` and the packaged app are
  different app identities to macOS and need permission granted separately).
- **better-sqlite3 fails to load after `npm install`** - run
  `npx electron-builder install-app-deps` to rebuild it for Electron's ABI.
- **Resume upload fails** - only text-based PDFs are supported; scanned
  image resumes have no extractable text.

## Privacy

Resumes and interview transcripts are stored only in a local SQLite database
in your OS's application data directory. Your resume text, spoken answers,
and interview transcripts are sent to OpenAI to generate questions,
evaluate answers, and produce speech - that's inherent to how the app
works, since it requires an API key to function at all. Use **Settings →
Clear Interview History** to delete everything stored locally.

## License

All rights reserved. See [LICENSE](LICENSE) - this code may not be used,
copied, modified, or distributed without prior written permission from the
copyright holder.
