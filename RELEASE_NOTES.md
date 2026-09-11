## AI Interviewer v1.0.0

First release. Practice job interviews with an AI interviewer that adapts to
your resume and your answers.

### What's included

- Resume-aware, adaptive voice interviews (Web Speech API in, SpeechSynthesis out)
- A free built-in mock interviewer mode - no API key required to try the app
- Add your own OpenAI API key from **Settings** after installing - it's saved
  encrypted on your device and stays active every time you open the app,
  until you change or remove it
- Local interview history and scored reports (SQLite, stored on your device)

### Downloads

- **macOS:** download the `.dmg`, open it, and drag the app to Applications.
  The app is not code-signed, so macOS Gatekeeper may warn it's from an
  unidentified developer - right-click the app and choose **Open** once to
  bypass this.
- **Windows:** download the `.exe` installer and run it. Windows SmartScreen
  may warn about an unrecognized publisher - choose **More info → Run anyway**.

### Using your own OpenAI API key

1. Open the app and go to **Settings**.
2. Paste your API key under **OpenAI API Key** and click **Save**.
3. That's it - the app now uses real AI-generated questions and feedback
   every time you open it, until you remove or replace the key.

Without a key, the app runs in mock mode automatically, so you can try the
full experience for free.
