/**
 * Records the microphone and automatically stops when the candidate goes
 * quiet, so the interview can run hands-free: no click-to-talk button is
 * needed for the normal flow. This uses raw getUserMedia + MediaRecorder
 * (which works fine in Electron) rather than the browser's
 * SpeechRecognition API, which Electron's bundled Chromium does not
 * actually implement (it requires a private Google service that only
 * official Chrome ships credentials for).
 */

const SILENCE_DURATION_MS = 3000
const MAX_WAIT_FOR_SPEECH_MS = 8000
const MAX_RECORDING_MS = 90000
const VOLUME_POLL_INTERVAL_MS = 100
const SILENCE_RMS_THRESHOLD = 0.02

export interface RecordingResult {
  blob: Blob
  mimeType: string
}

export type AudioRecorderErrorReason = 'permission-denied' | 'unsupported' | 'cancelled' | 'unknown'

export class AudioRecorderError extends Error {
  reason: AudioRecorderErrorReason
  constructor(reason: AudioRecorderErrorReason, message: string) {
    super(message)
    this.reason = reason
  }
}

export class AudioRecorderService {
  private stream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private chunks: Blob[] = []
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private recording = false
  private rejectPending: ((error: AudioRecorderError) => void) | null = null

  isRecording(): boolean {
    return this.recording
  }

  static isSupported(): boolean {
    return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'
  }

  /**
   * Starts recording and resolves automatically once the candidate has
   * spoken and then gone quiet for SILENCE_DURATION_MS. The caller only
   * needs to call stop() to end the answer early, or cancel() to abort.
   */
  async start(): Promise<RecordingResult> {
    if (!AudioRecorderService.isSupported()) {
      throw new AudioRecorderError('unsupported', 'Voice recording is not available in this environment.')
    }

    let stream: MediaStream
    try {
      // Explicitly requesting echo cancellation is what stops the mic from
      // picking up the AI's own voice through the speakers and feeding it
      // back in as if it were the candidate's answer.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
    } catch {
      throw new AudioRecorderError(
        'permission-denied',
        'Microphone access was denied. Please allow microphone access, or type your answer instead.'
      )
    }

    this.stream = stream
    this.chunks = []
    this.recording = true

    const mimeType = pickSupportedMimeType()
    const effectiveMimeType = mimeType ?? 'audio/webm'
    this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data)
      }
    }

    this.audioContext = new AudioContext()
    const source = this.audioContext.createMediaStreamSource(stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    source.connect(this.analyser)

    return new Promise<RecordingResult>((resolve, reject) => {
      this.rejectPending = reject

      this.mediaRecorder!.onstop = () => {
        this.rejectPending = null
        const blob = new Blob(this.chunks, { type: effectiveMimeType })
        this.cleanupHardware()
        resolve({ blob, mimeType: effectiveMimeType })
      }

      const startedAt = Date.now()
      let lastLoudAt: number | null = null
      const timeDomainData = new Uint8Array(this.analyser!.fftSize)

      this.pollTimer = setInterval(() => {
        if (!this.analyser) return
        this.analyser.getByteTimeDomainData(timeDomainData)
        const rms = calculateRms(timeDomainData)
        const now = Date.now()

        if (rms > SILENCE_RMS_THRESHOLD) {
          lastLoudAt = now
        }

        const elapsed = now - startedAt
        const hasSpokenYet = lastLoudAt !== null
        const goneQuietTooLong = hasSpokenYet && now - lastLoudAt! > SILENCE_DURATION_MS
        const neverSpoke = !hasSpokenYet && elapsed > MAX_WAIT_FOR_SPEECH_MS
        const ranTooLong = elapsed > MAX_RECORDING_MS

        if (goneQuietTooLong || neverSpoke || ranTooLong) {
          this.stop()
        }
      }, VOLUME_POLL_INTERVAL_MS)

      this.mediaRecorder!.start(250)
    })
  }

  /** Ends recording now and resolves the pending start() promise with whatever was captured. */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.recording = false
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
  }

  /** Aborts and rejects the pending start() promise - used when the interview ends mid-recording. */
  cancel(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.recording = false
    const reject = this.rejectPending
    this.rejectPending = null
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }
    }
    this.cleanupHardware()
    if (reject) {
      reject(new AudioRecorderError('cancelled', 'Recording was cancelled.'))
    }
  }

  private cleanupHardware(): void {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.audioContext?.close().catch(() => undefined)
    this.audioContext = null
    this.analyser = null
    this.mediaRecorder = null
  }
}

function calculateRms(data: Uint8Array): number {
  let sumSquares = 0
  for (let i = 0; i < data.length; i += 1) {
    const normalized = (data[i] - 128) / 128
    sumSquares += normalized * normalized
  }
  return Math.sqrt(sumSquares / data.length)
}

function pickSupportedMimeType(): string | null {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }
  return null
}
