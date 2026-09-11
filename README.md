# AI Interviewer

A desktop app for practicing job interviews with an AI interviewer. Pick a role,
upload your resume, and do a spoken mock interview - the AI asks one question at
a time, adapts to your answers, and gives you a scored report at the end.

## What it does

1. You select a job role, experience level, interview type, difficulty, style,
   and length, and upload a resume (PDF).
2. The app reads your resume locally and extracts skills, experience, projects,
   education, and certifications.
3. You start a voice interview. The AI interviewer asks one question at a time,
   using your resume and the job description (if provided) to guide topics.
4. You answer by speaking (or typing, as a fallback). The AI evaluates each
   answer, asks follow-up questions on vague or interesting answers, and
   adapts difficulty as you go.
5. When the interview ends, you get a full report: scores, strengths,
   weaknesses, a question-by-question breakdown, and suggested next steps.
6. Past interviews are saved locally so you can track progress over time.

## Features

- Resume-aware, adaptive interview questions (not a generic chatbot)
- Voice input (Web Speech API) and voice output (SpeechSynthesis) - no paid
  speech API required
- Automatic text-input fallback when voice isn't available
- A **mock AI mode** that runs the entire app for free, with no API key
- Local SQLite storage for interview history - resumes and transcripts never
  leave your machine unless you've configured a real OpenAI API key
- API keys are encrypted at rest via the OS keychain (Electron `safeStorage`)

## Technology

- **Desktop shell:** Electron
- **Frontend:** React + TypeScript + Vite (via `electron-vite`)
- **Backend:** Node.js running in the Electron main process, reached from the
  renderer only through a typed IPC bridge (no direct filesystem/network
  access from the UI, and the OpenAI key never touches renderer code)
- **Database:** SQLite (`better-sqlite3`)
- **AI:** OpenAI API (swappable behind a small `InterviewAI` interface)
- **Resume parsing:** `pdf-parse`, entirely on-device

## Project structure

```
src/
  main/            Electron main process
    backend/
      ai/          InterviewAI interface + mock and OpenAI implementations
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
npm run dev
```

This opens the app in mock AI mode by default (see below), so you can use the
whole app without an API key or spending anything.

## Environment variables

Set these in `.env` during development (see `.env.example`):

| Variable          | Description                                             |
| ----------------- | -------------------------------------------------------- |
| `OPENAI_API_KEY`  | Your OpenAI API key. Leave empty to stay in mock mode.   |
| `OPENAI_MODEL`    | Model used for interview questions/evaluation. Default: `gpt-4o-mini`. |
| `USE_MOCK_AI`     | `true` forces the mock interviewer even if a key is set. |

In the packaged app, the API key is instead entered in **Settings** and stored
encrypted on disk - `.env` is only used for local development.

## Mock mode (no API key needed)

If `USE_MOCK_AI=true` or no API key is configured (via `.env` or Settings),
the app automatically uses a built-in mock interviewer: resume-aware,
canned-but-reasonable questions and feedback, with zero API calls. This is
the default in `.env.example` so you can build and test the full UI for free.

## Configuring OpenAI

1. Get an API key from https://platform.openai.com.
2. Either put it in `.env` as `OPENAI_API_KEY` (development), or open the
   app's **Settings** page and paste it there (works in both dev and the
   packaged app, and is what end users should do).
3. Leave `USE_MOCK_AI` unset or `false` to use the real AI.

## Testing

```bash
npm run typecheck
npm test
```

Tests run through Electron's own Node binary (`ELECTRON_RUN_AS_NODE=1`)
because `better-sqlite3` is compiled specifically for Electron's ABI - a
plain Node test runner would hit a `NODE_MODULE_VERSION` mismatch.

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
- **"Voice input is not available in this environment"** - your platform's
  Chromium build doesn't support the Web Speech API, or microphone
  permission was denied. Use the "Type answer instead" fallback.
- **better-sqlite3 fails to load after `npm install`** - run
  `npx electron-builder install-app-deps` to rebuild it for Electron's ABI.
- **Resume upload fails** - only text-based PDFs are supported; scanned
  image resumes have no extractable text.

## Privacy

Resumes and interview transcripts are stored only in a local SQLite database
in your OS's application data directory. Nothing is sent anywhere except to
OpenAI, and only when a real API key is configured (mock mode makes no
network calls at all). Use **Settings → Clear Interview History** to delete
everything.
