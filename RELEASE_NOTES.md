## AI Interviewer v1.1.0

Practice job interviews with an AI interviewer that adapts to your resume
and your answers.

### What's new in v1.1.0

- **Fixed voice input** - it previously failed silently because Electron's
  bundled Chromium doesn't actually support the browser's speech
  recognition API. Voice now records your microphone directly and
  transcribes it with OpenAI Whisper.
- **Natural AI voice** - the interviewer now speaks with an OpenAI TTS
  voice instead of the more robotic default system voice (pick from 6
  voices in Settings).
- **Hands-free interview flow** - the mic listens automatically once the
  interviewer finishes speaking and stops on its own when you go quiet, so
  there's no click-to-talk button to manage mid-interview.
- **Live conversation transcript** shown alongside the interview.
- Fixed a macOS microphone permission bug where the app never showed the
  permission prompt at all.

Voice input and the AI voice both require a real OpenAI API key (see
below) - mock mode automatically falls back to typed answers and the free
browser voice, so it stays free to try.

### What's included

- Resume-aware, adaptive voice interviews
- A free built-in mock interviewer mode - no API key required to try the app
- Add your own OpenAI API key from **Settings** after installing - it's saved
  encrypted on your device and stays active every time you open the app,
  until you change or remove it
- Local interview history and scored reports (SQLite, stored on your device)

### Downloads

- **macOS:** download the `.dmg` matching your Mac - `arm64` for Apple
  Silicon (M1/M2/M3/M4), `x64` for Intel - open it, and drag the app to
  Applications. The app is not code-signed, so macOS Gatekeeper may warn
  it's from an unidentified developer - right-click the app and choose
  **Open** once to bypass this.
- **Windows:** download the `.exe` installer and run it. Windows SmartScreen
  may warn about an unrecognized publisher - choose **More info → Run anyway**.

### Using your own OpenAI API key

1. Open the app and go to **Settings**.
2. Paste your API key under **OpenAI API Key** and click **Save**.
3. That's it - the app now uses real AI-generated questions, a natural
   voice, and voice input every time you open it, until you remove or
   replace the key.

Without a key, the app runs in mock mode automatically, so you can try the
full experience for free.
