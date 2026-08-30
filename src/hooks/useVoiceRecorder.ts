import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceTrack } from '../types'

export const useVoiceRecorder = (onComplete: (track: VoiceTrack) => void) => {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string>()
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
  }, [])

  const start = useCallback(async () => {
    setError(undefined)
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('이 브라우저에서는 음성 녹음을 지원하지 않아요.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferred = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type))
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
          transcript: '',
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
      setRecording(true)
    } catch (cause) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setRecording(false)
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? '마이크 권한이 꺼져 있어요. 브라우저 설정에서 마이크를 허용해 주세요.'
        : cause instanceof Error ? cause.message : '녹음을 시작하지 못했어요.')
    }
  }, [onComplete])

  const stop = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    setRecording(false)
  }, [])

  return { recording, seconds, transcript, error, start, stop }
}
