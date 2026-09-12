## AI Interviewer v1.0.0

Practice job interviews with an AI interviewer that adapts to your resume
and your answers - fully hands-free, voice in and voice out.

### What it does

- Pick a role, upload your resume, and start a spoken interview.
- The interviewer opens with a natural icebreaker, then asks questions
  based on your resume, the job description, and how you're answering -
  following up on vague or interesting answers, adjusting difficulty as it
  goes.
- Just talk - the mic listens automatically after each question and stops
  on its own once you go quiet. No click-to-talk button.
- A live text transcript of the conversation is shown alongside the
  interview.
- At the end, get a full scored report: strengths, weaknesses, a
  question-by-question breakdown, and what to study next.
- Past interviews are saved locally so you can track progress over time.

### Requirements

This app requires your own OpenAI API key - there is no offline or free
mode. The entire pipeline (interview questions and evaluation, speech-to-
text via Whisper, and natural voice output via TTS) runs on the OpenAI
API, so every interview costs a small amount on your OpenAI account
(typically well under $0.50 for a full interview with gpt-4o-mini).

### Downloads

- **macOS:** download the `.dmg` matching your Mac - `arm64` for Apple
  Silicon (M1/M2/M3/M4), `x64` for Intel - open it, and drag the app to
  Applications. The app is not code-signed, so macOS Gatekeeper may warn
  it's from an unidentified developer - right-click the app and choose
  **Open** once to bypass this.
- **Windows:** download the `.exe` installer and run it. Windows SmartScreen
  may warn about an unrecognized publisher - choose **More info → Run anyway**.

### Getting started

1. Install and open the app.
2. Go to **Settings** and paste in your OpenAI API key - it's saved
   encrypted on your device and stays active every time you open the app,
   until you change or remove it.
3. Start a new interview, upload your resume, and go.

On macOS, the first time you start an interview you'll be asked to grant
microphone access - if you don't see the prompt, check System Settings →
Privacy & Security → Microphone.
