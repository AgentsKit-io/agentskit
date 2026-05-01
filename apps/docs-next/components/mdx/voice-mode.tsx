'use client'

import { useEffect, useRef, useState } from 'react'

export interface VoiceModeProps {
  /**
   * Async function that takes an audio Blob (webm / wav) and returns the
   * transcript. Bring your own — Whisper, Deepgram, or anything that
   * returns a string. Required for live transcription.
   */
  transcribe?: (audio: Blob) => Promise<string>
  /**
   * Async function that takes the transcript and yields assistant text
   * chunks. Wire this to a useChat / runtime / fetch endpoint. If
   * omitted, the component echoes back the transcript.
   */
  respond?: (text: string) => AsyncIterable<string>
  /**
   * Async function that takes assistant text and returns an audio Blob
   * to play (TTS). If omitted, no audio plays — the component is text-
   * only.
   */
  speak?: (text: string) => Promise<Blob>
  /**
   * Energy threshold (0..1) above which the mic is considered "active".
   * 0.02 catches normal speech without false-firing on room noise. Tune
   * upward if your environment is loud.
   */
  vadThreshold?: number
  /**
   * Frames of silence (≈25ms each) before the utterance is considered
   * finished. Default 20 ≈ 500ms.
   */
  silenceFrames?: number
}

type Status = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

interface Turn { role: 'user' | 'assistant'; text: string }

/**
 * `<VoiceMode />` — push-to-listen mic + energy-threshold VAD + barge-in.
 *
 * Flow per turn:
 *   1. User clicks "Start" → mic opens, VAD watches RMS energy.
 *   2. Energy crosses `vadThreshold` → start recording (MediaRecorder).
 *   3. Energy stays below threshold for `silenceFrames` frames → stop
 *      recording, hand the Blob to `transcribe`.
 *   4. Pipe the transcript through `respond`, accumulate text, then
 *      hand to `speak` for TTS playback.
 *   5. While playback is running, VAD keeps watching — energy crossing
 *      threshold mid-playback **stops the audio** (barge-in) and starts
 *      capturing the next utterance.
 *
 * No external models. VAD is a simple RMS-energy threshold computed
 * from a 2048-bin AnalyserNode. Caller brings their own ASR / TTS via
 * the `transcribe` / `respond` / `speak` functions, so the component
 * stays free of vendor lock-in.
 */
export function VoiceMode({
  transcribe,
  respond,
  speak,
  vadThreshold = 0.02,
  silenceFrames = 20,
}: VoiceModeProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [active, setActive] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const silenceCountRef = useRef(0)
  const speakingRef = useRef(false)

  const stopAll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    recorderRef.current?.state === 'recording' && recorderRef.current.stop()
    recorderRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    analyserRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    speakingRef.current = false
  }

  useEffect(() => {
    return () => stopAll()
  }, [])

  const start = async () => {
    setError(null)
    setActive(true)
    setStatus('listening')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser
      tick()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setActive(false)
      setStatus('idle')
    }
  }

  const stop = () => {
    setActive(false)
    setStatus('idle')
    stopAll()
  }

  const tick = () => {
    const analyser = analyserRef.current
    if (!analyser) return
    const buffer = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buffer)
    let sum = 0
    for (let i = 0; i < buffer.length; i++) sum += buffer[i]! * buffer[i]!
    const rms = Math.sqrt(sum / buffer.length)
    const isVoice = rms > vadThreshold

    // Barge-in: cut TTS the moment we hear the user.
    if (isVoice && speakingRef.current) {
      audioRef.current?.pause()
      audioRef.current = null
      speakingRef.current = false
      setStatus('listening')
    }

    if (isVoice) {
      silenceCountRef.current = 0
      if (!recorderRef.current && !speakingRef.current) {
        beginUtterance()
      }
    } else if (recorderRef.current?.state === 'recording') {
      silenceCountRef.current += 1
      if (silenceCountRef.current >= silenceFrames) {
        endUtterance()
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const beginUtterance = () => {
    const stream = streamRef.current
    if (!stream) return
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => onUtteranceFinished(new Blob(chunksRef.current, { type: 'audio/webm' }))
    recorder.start(100)
    recorderRef.current = recorder
    setStatus('listening')
  }

  const endUtterance = () => {
    const recorder = recorderRef.current
    recorderRef.current = null
    silenceCountRef.current = 0
    if (recorder && recorder.state === 'recording') recorder.stop()
  }

  const onUtteranceFinished = async (blob: Blob) => {
    setStatus('transcribing')
    let userText = ''
    try {
      userText = transcribe ? await transcribe(blob) : '(transcription not configured)'
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('listening')
      return
    }
    if (!userText.trim()) {
      setStatus('listening')
      return
    }
    setTurns(prev => [...prev, { role: 'user', text: userText }])

    setStatus('thinking')
    let assistantText = ''
    try {
      if (respond) {
        for await (const chunk of respond(userText)) {
          assistantText += chunk
          setTurns(prev => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { role: 'assistant', text: assistantText }]
            }
            return [...prev, { role: 'assistant', text: assistantText }]
          })
        }
      } else {
        assistantText = `(echo) ${userText}`
        setTurns(prev => [...prev, { role: 'assistant', text: assistantText }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('listening')
      return
    }

    if (speak && assistantText.trim()) {
      try {
        const audioBlob = await speak(assistantText)
        const url = URL.createObjectURL(audioBlob)
        const audio = new Audio(url)
        audioRef.current = audio
        speakingRef.current = true
        setStatus('speaking')
        audio.onended = () => {
          URL.revokeObjectURL(url)
          if (speakingRef.current) {
            speakingRef.current = false
            audioRef.current = null
            setStatus('listening')
          }
        }
        await audio.play()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setStatus('listening')
      }
    } else {
      setStatus('listening')
    }
  }

  return (
    <div data-ak-voice-mode className="my-6 overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
      <div className="flex items-center justify-between border-b border-ak-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-ak-midnight px-1.5 py-0.5 font-mono uppercase tracking-[0.15em] text-ak-graphite">
            voice
          </span>
          <span className="text-ak-foam">{statusLabel(status)}</span>
        </div>
        {active ? (
          <button type="button" onClick={stop} className="rounded bg-ak-midnight px-2.5 py-1 text-xs text-ak-foam">
            Stop
          </button>
        ) : (
          <button type="button" onClick={start} className="rounded bg-ak-foam px-2.5 py-1 text-xs font-semibold text-ak-midnight">
            Start
          </button>
        )}
      </div>
      {error && (
        <div className="border-b border-ak-border bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
      <div style={{ minHeight: 120, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
        {turns.length === 0 && <div className="text-ak-graphite">Say something to begin.</div>}
        {turns.map((turn, i) => (
          <div key={i} style={{ margin: '6px 0', color: turn.role === 'user' ? 'var(--color-ak-foam, #f5f5f5)' : 'var(--color-ak-blue, #4ea1ff)' }}>
            <strong>{turn.role}:</strong> {turn.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function statusLabel(s: Status): string {
  switch (s) {
    case 'idle': return 'idle'
    case 'listening': return 'listening…'
    case 'transcribing': return 'transcribing…'
    case 'thinking': return 'thinking…'
    case 'speaking': return 'speaking (barge-in armed)'
  }
}
