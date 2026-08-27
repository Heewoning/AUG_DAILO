export interface TranscriptSegment {
  text: string
  final: boolean
  at: number
}

export interface LiveTranscriber {
  readonly available: boolean
  start(onTranscript: (segment: TranscriptSegment) => void, language?: string): void
  stop(): void
}

interface RecognitionAlternativeLike { transcript: string }
interface RecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: RecognitionAlternativeLike
}
interface RecognitionEventLike {
  readonly resultIndex: number
  readonly results: { readonly length: number; [index: number]: RecognitionResultLike }
}
interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}
type RecognitionConstructor = new () => RecognitionLike

const recognitionConstructor = () => {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition
}

export class BrowserLiveTranscriber implements LiveTranscriber {
  readonly available = Boolean(recognitionConstructor())
  private recognition?: RecognitionLike
  private startedAt = 0

  start(onTranscript: (segment: TranscriptSegment) => void, language = 'ko-KR') {
    const Constructor = recognitionConstructor()
    if (!Constructor) return
    this.startedAt = performance.now()
    const recognition = new Constructor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0]?.transcript.trim()
        if (text) onTranscript({ text, final: result.isFinal, at: (performance.now() - this.startedAt) / 1000 })
      }
    }
    recognition.onerror = () => undefined
    recognition.start()
    this.recognition = recognition
  }

  stop() {
    this.recognition?.stop()
    this.recognition = undefined
  }
}

export const liveTranscriber: LiveTranscriber = new BrowserLiveTranscriber()
