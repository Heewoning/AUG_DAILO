import { useCallback, useEffect, useRef, useState } from 'react'
import { liveTranscriber } from '../services/speech'
import type { VoiceTrack } from '../types'

export const useVoiceRecorder = (onComplete: (track: VoiceTrack) => void) => {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const recorderRef = useRef<MediaRecorder | undefined>(undefined)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const transcriptRef = useRef('')

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setSeconds((performance.now() - startedAtRef.current) / 1000), 100)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    liveTranscriber.stop()
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('이 브라우저에서는 음성 녹음을 지원하지 않습니다.')
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream)
    chunksRef.current = []
    transcriptRef.current = ''
    setTranscript('')
    setSeconds(0)
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      onComplete({
        blob,
        url: URL.createObjectURL(blob),
        duration: (performance.now() - startedAtRef.current) / 1000,
        transcript: transcriptRef.current.trim(),
        volume: 100,
        fadeIn: true,
        fadeOut: true,
        createdAt: new Date().toISOString(),
      })
      stream.getTracks().forEach((track) => track.stop())
    }
    recorderRef.current = recorder
    streamRef.current = stream
    startedAtRef.current = performance.now()
    recorder.start(250)
    liveTranscriber.start((segment) => {
      if (segment.final) {
        transcriptRef.current = `${transcriptRef.current} ${segment.text}`.trim()
        setTranscript(transcriptRef.current)
      } else {
        setTranscript(`${transcriptRef.current} ${segment.text}`.trim())
      }
    })
    setRecording(true)
  }, [onComplete])

  const stop = useCallback(() => {
    liveTranscriber.stop()
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    setRecording(false)
  }, [])

  return { recording, seconds, transcript, transcriptionAvailable: liveTranscriber.available, start, stop }
}
