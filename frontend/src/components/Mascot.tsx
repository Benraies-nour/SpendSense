import { useEffect, useRef, useState } from 'react'
import type { Category } from '../types'
import { fetchCategories, fetchProfile, resolvePendingDraft, transcribeAudio, tts, voiceChat } from '../lib/api'
import type { VoiceDraft } from '../lib/api'
import { ManualEntryDialog } from './ManualEntryDialog'
import { MascotAvatar } from './MascotAvatar'

type MascotState = 'idle' | 'listening' | 'thinking' | 'confirming' | 'speaking'

type Props = {
  onExpenseSaved?: () => void
}

const WAKE_CHUNK_MS = 3000
const WAKE_WORDS    = ['nova', 'nava', 'nowa', 'noua', 'no va']

export function Mascot({ onExpenseSaved }: Props) {
  const [state, setState]           = useState<MascotState>('idle')
  const [reply, setReply]           = useState('')
  const [draft, setDraft]           = useState<VoiceDraft | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm]     = useState(false)

  const [liveText, setLiveText] = useState('')

  const userNameRef = useRef<string | null>(null)
  useEffect(() => {
    fetchProfile().then(p => { userNameRef.current = p.name || null }).catch(() => {})
  }, [])

  const stateRef        = useRef<MascotState>('idle')
  const streamRef       = useRef<MediaStream | null>(null)
  const wakeRecorderRef = useRef<MediaRecorder | null>(null)
  const cmdRecorderRef  = useRef<MediaRecorder | null>(null)
  const wakeStoppedRef  = useRef(false)
  const followUpRef        = useRef(false) // true when listening after "anything else?"
  const confirmTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRef           = useRef<VoiceDraft | null>(null)
  const confirmListenRef   = useRef(false) // true while voice-confirm recording is active

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { draftRef.current = draft }, [draft])

  // Wake word loop (MediaRecorder + Whisper) 
  useEffect(() => {
    let stopped = false
    wakeStoppedRef.current = false

    async function initMic() {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      } catch {
        console.warn('[Nova] mic not available')
        return
      }
      recordWakeChunk(stream, () => stopped || wakeStoppedRef.current)
    }

    initMic()
    return () => {
      stopped = true
      wakeStoppedRef.current = true
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      try { wakeRecorderRef.current?.stop() } catch (_) {}
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  function recordWakeChunk(stream: MediaStream, isStopped: () => boolean) {
    if (isStopped()) return
    if (stateRef.current !== 'idle') {
      setTimeout(() => recordWakeChunk(stream, isStopped), 500)
      return
    }

    const chunks: Blob[] = []
    let mr: MediaRecorder
    try { mr = new MediaRecorder(stream) } catch { return }

    wakeRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mr.onstop = async () => {
      if (isStopped()) return
      if (stateRef.current !== 'idle') {
        setTimeout(() => recordWakeChunk(stream, isStopped), 500)
        return
      }
      const blob = new Blob(chunks, { type: 'audio/webm' })
      if (blob.size > 1000) {
        try {
          const text = await transcribeAudio(blob)
          console.log('[Nova wake]:', text)
          if (WAKE_WORDS.some(w => text.toLowerCase().includes(w)) && stateRef.current === 'idle') {
            wakeStoppedRef.current = true
            activateNova(stream, isStopped)
            return
          }
        } catch { /* ignore */ }
      }
      setTimeout(() => recordWakeChunk(stream, isStopped), 200)
    }

    mr.start()
    setTimeout(() => { try { mr.stop() } catch (_) {} }, WAKE_CHUNK_MS)
  }

  // Activate after wake word
  async function activateNova(stream: MediaStream, isStopped: () => boolean) {
    setState('speaking')
    const msg = `Hi${userNameRef.current ? ` ${userNameRef.current}` : ''}! How can I help you?`
    setReply(msg)

    try {
      const b64 = await tts(msg)
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setReply(''); startCommandRecording(stream, isStopped) }
      audio.play()
    } catch {
      setTimeout(() => { setReply(''); startCommandRecording(stream, isStopped) }, 1500)
    }
  }

  // Play "anything else?" then start a 10s follow-up window before going idle
  async function finishConversation(stream: MediaStream, isStopped: () => boolean) {
    const msg = "Is there anything else I can help you with?"
    setState('speaking')
    setReply(msg)
    try {
      const b64 = await tts(msg)
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      const audio = new Audio(url)
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setReply('')
        // After "anything else?" listen 10s; if still nothing → go idle directly (no loop)
        followUpRef.current = true
        startCommandRecording(stream, isStopped, 10_000, () => {
          followUpRef.current = false
          resumeWake(stream, isStopped)
        })
      }
      audio.play()
    } catch {
      setTimeout(() => { setReply(''); resumeWake(stream, isStopped) }, 1500)
    }
  }

  // Called after confirming a task: mark draft resolved, wait 5s, ask "anything else?" → 10s → idle
  async function postTaskFlow() {
    if (draft?.pending_id) resolvePendingDraft(draft.pending_id, 'confirmed').catch(() => {})

    const stream = streamRef.current
    if (!stream?.active) return
    wakeStoppedRef.current = true  // pause wake detection during flow
    const isStopped = () => wakeStoppedRef.current

    setDraft(null)
    setReply('')
    setState('thinking')

    await new Promise<void>(res => setTimeout(res, 5000))
    await finishConversation(stream, isStopped)
  }

  // Record user command with silence detection + live transcription
  // onAutoStop: callback when the hard fallback timer fires with no speech (default: finishConversation)
  function startCommandRecording(
    stream: MediaStream,
    isStopped: () => boolean,
    fallbackMs?: number,
    onAutoStop?: () => void,
  ) {
    const allChunks: Blob[] = []
    let mr: MediaRecorder
    try { mr = new MediaRecorder(stream) } catch { return }

    cmdRecorderRef.current = mr
    setLiveText('')
    setState('listening')

    // Silence detection via Web Audio API
    let audioCtx: AudioContext | null = null
    let silenceTimer: ReturnType<typeof setTimeout> | null = null
    let speechDetected = false
    let silencePoller: ReturnType<typeof setInterval> | null = null
    const SILENCE_THRESHOLD = 8   // avg amplitude (0–255)
    const SILENCE_AFTER_MS  = 1500 // stop 1.5s after speech ends

    try {
      audioCtx = new AudioContext()
      const source   = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)

      silencePoller = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        if (avg > SILENCE_THRESHOLD) {
          speechDetected = true
          if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
        } else if (speechDetected && !silenceTimer) {
          silenceTimer = setTimeout(() => { try { mr.stop() } catch (_) {} }, SILENCE_AFTER_MS)
        }
      }, 100)
    } catch { /* AudioContext not available — fall back to fallback timer only */ }

    // Hard fallback: if user says nothing at all, treat as auto-stop after fallbackMs
    let wasAutoStopped = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    if (fallbackMs) {
      fallbackTimer = setTimeout(() => {
        wasAutoStopped = true
        try { mr.stop() } catch (_) {}
      }, fallbackMs)
    }

    // Live transcription snapshot every 2s
    const liveTimer = setInterval(async () => {
      if (allChunks.length === 0) return
      const snapshot = new Blob([...allChunks], { type: 'audio/webm' })
      try {
        const text = await transcribeAudio(snapshot)
        if (text.trim()) setLiveText(text)
      } catch { /* ignore */ }
    }, 2000)

    function cleanup() {
      if (liveTimer)    clearInterval(liveTimer)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (silencePoller) clearInterval(silencePoller)
      if (silenceTimer)  clearTimeout(silenceTimer)
      audioCtx?.close().catch(() => {})
    }

    mr.ondataavailable = (e) => { if (e.data.size > 0) allChunks.push(e.data) }
    mr.onstop = async () => {
      cleanup()

      if (wasAutoStopped || (!speechDetected && allChunks.length < 3)) {
        if (onAutoStop) { onAutoStop() }
        else            { await finishConversation(stream, isStopped) }
        return
      }

      setState('thinking')
      const blob = new Blob(allChunks, { type: 'audio/webm' })
      await handleAudioReady(blob, stream, isStopped)
    }

    mr.start(500)
  }

  const YES_REPLIES = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'oui', 'ouais',
    'yup', 'go ahead', 'add it', 'do it', 'confirm', 'save it']

  const NO_REPLIES = ['no', 'nope', 'non', 'nah', 'nothing', 'rien', 'no thanks',
    'no thank you', 'nothing else', "that's all", "that's it", 'never mind', 'nevermind']

  function clearConfirmTimeout() {
    if (confirmTimeoutRef.current) { clearTimeout(confirmTimeoutRef.current); confirmTimeoutRef.current = null }
  }

  function abandonCurrentDraft() {
    const d = draftRef.current
    if (d?.pending_id) resolvePendingDraft(d.pending_id, 'abandoned').catch(() => {})
    setDraft(null)
  }

  function confirmPrompt(type: string) {
    if (type === 'income')   return "Do you still want to add this income?"
    if (type === 'category') return "Do you still want to create this category?"
    return "Do you still want to add this expense?"
  }

  async function askConfirmAgain() {
    if (stateRef.current !== 'confirming') return
    const stream = streamRef.current
    const d = draftRef.current
    if (!stream?.active || !d) { abandonCurrentDraft(); setState('idle'); return }

    const msg = confirmPrompt(d.type)
    wakeStoppedRef.current = true
    setState('speaking')
    setReply(msg)

    try {
      const b64   = await tts(msg)
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setReply(''); setState('confirming'); listenForConfirmResponse(stream) }
      audio.play()
    } catch {
      setReply('')
      setState('confirming')
      listenForConfirmResponse(stream)
    }
  }

  function listenForConfirmResponse(stream: MediaStream) {
    confirmListenRef.current = true
    const chunks: Blob[] = []
    let mr: MediaRecorder
    try { mr = new MediaRecorder(stream) } catch {
      confirmListenRef.current = false
      abandonCurrentDraft()
      resumeWake(stream, () => wakeStoppedRef.current)
      return
    }

    const autoStop = setTimeout(() => { try { mr.stop() } catch {} }, 10_000)
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mr.onstop = async () => {
      clearTimeout(autoStop)
      if (!confirmListenRef.current) return  // button clicked, already handled
      confirmListenRef.current = false

      const blob = new Blob(chunks, { type: 'audio/webm' })
      if (blob.size < 500) { abandonCurrentDraft(); resumeWake(stream, () => wakeStoppedRef.current); return }

      try {
        const text = await transcribeAudio(blob)
        const norm = text.trim().toLowerCase().replace(/[.,!?]+$/, '').trim()

        if (YES_REPLIES.some(w => norm === w || norm.startsWith(w + ' '))) {
          await handleConfirm(); return
        }
        if (NO_REPLIES.some(w => norm === w || norm.startsWith(w + ' '))) {
          const farewell = "Okay, I'm here if you need anything."
          abandonCurrentDraft()
          setState('speaking')
          setReply(farewell)
          try {
            const b64   = await tts(farewell)
            const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
            const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
            const audio = new Audio(url)
            audio.onended = () => { URL.revokeObjectURL(url); setReply(''); resumeWake(stream, () => wakeStoppedRef.current) }
            audio.play()
          } catch {
            setReply('')
            resumeWake(stream, () => wakeStoppedRef.current)
          }
          return
        }
      } catch { /* ignore */ }
      // Not yes/no → treat as an amendment, send to Nova
      setState('thinking')
      await handleAudioReady(blob, stream, () => wakeStoppedRef.current)
    }

    mr.start(500)
  }

  // Transcribe + chat
  async function handleAudioReady(blob: Blob, stream: MediaStream, isStopped: () => boolean) {
    try {
      const text = await transcribeAudio(blob)
      if (!text.trim()) { resumeWake(stream, isStopped); return }

      // If we're in the "anything else?" follow-up phase and user says no → go idle
      if (followUpRef.current) {
        followUpRef.current = false
        const normalized = text.trim().toLowerCase().replace(/[.,!?]+$/, '').trim()
        if (NO_REPLIES.some(w => normalized === w || normalized.startsWith(w + ' '))) {
          resumeWake(stream, isStopped)
          return
        }
        followUpRef.current = false
      }

      const result = await voiceChat(text)

      const bytes = Uint8Array.from(atob(result.audio_b64), c => c.charCodeAt(0))
      const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      const audio = new Audio(url)

      if (result.draft) {
        setDraft(result.draft)
        setReply(result.reply_text)
        setState('confirming')
        audio.onended = () => {
          URL.revokeObjectURL(url)
          // Start listening immediately — user can confirm, deny, or amend by voice
          listenForConfirmResponse(stream)
          confirmTimeoutRef.current = setTimeout(askConfirmAgain, 30_000)
        }
      } else {
        setState('speaking')
        setReply(result.reply_text)
        audio.onended = () => {
          URL.revokeObjectURL(url)
          // Keep reply visible and go back to listening — user must tap Envoyer to reply
          startCommandRecording(stream, isStopped, 30_000)
        }
      }

      audio.play()
    } catch {
      const errMsg = "Sorry, I couldn't find an answer. Please try again."
      setState('speaking')
      setReply(errMsg)
      try {
        const b64   = await tts(errMsg)
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
        const audio = new Audio(url)
        audio.onended = () => { URL.revokeObjectURL(url); setReply(''); resumeWake(stream, isStopped) }
        audio.play()
      } catch {
        setTimeout(() => { setReply(''); resumeWake(stream, isStopped) }, 2500)
      }
    }
  }

  function resumeWake(stream: MediaStream, isStopped: () => boolean) {
    setState('idle')
    setLiveText('')
    wakeStoppedRef.current = false
    if (stream.active) setTimeout(() => recordWakeChunk(stream, isStopped), 200)
  }

  // Confirm
  async function handleConfirm() {
    clearConfirmTimeout()
    confirmListenRef.current = false
    if (!draft) return

    if (draft.type === 'expense') {
      try {
        const cats = categories.length > 0 ? categories : await fetchCategories()
        setCategories(cats)
      } catch { /* use whatever is already loaded */ }
      setReply('')
      setShowForm(true)
      // postTaskFlow called in onCreated after form submit
      return
    }

    sessionStorage.setItem('nova_draft', JSON.stringify(draft))
    const targetTab = draft.type === 'income' ? 'incomes' : 'categories'
    window.location.hash = '#/app/manage'
    window.dispatchEvent(new CustomEvent('nova-set-manage-tab', { detail: targetTab }))
    postTaskFlow()  // 5s → "anything else?" → 10s → idle
  }

  function handleDeny() {
    clearConfirmTimeout()
    confirmListenRef.current = false
    if (draft?.pending_id) resolvePendingDraft(draft.pending_id, 'abandoned').catch(() => {})
    const stream = streamRef.current
    if (!stream?.active) { setDraft(null); setReply(''); setState('idle'); return }
    wakeStoppedRef.current = true
    const isStopped = () => wakeStoppedRef.current
    setDraft(null)
    setReply('')
    // Ask "anything else?" immediately then listen 10s before going idle
    finishConversation(stream, isStopped)
  }

  // Ring color
  const ringColor: Record<MascotState, string> = {
    idle:       '#6b7280',
    listening:  '#ef4444',
    thinking:   '#f59e0b',
    confirming: '#8b5cf6',
    speaking:   '#22c55e',
  }

  return (
    <>
      <div style={container}>

        {state === 'idle' && (
          <div style={bubbleStyle}>
            <p style={{ margin: 0 }}>Hi! I&apos;m Nova 👋<br />Say <b>&quot;Nova&quot;</b> to activate me.</p>
          </div>
        )}

        {state === 'listening' && (
          <div style={bubbleStyle}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--muted-foreground)' }}>🎙 Listening…</p>
            {liveText && (
              <p style={{ margin: '0 0 8px', fontSize: 13, fontStyle: 'italic' }}>{liveText}</p>
            )}
            <button onClick={() => resumeWake(streamRef.current!, () => false)} style={{ ...cancelBtn, width: '100%' }}>Cancel</button>
          </div>
        )}

        {state === 'thinking' && (
          <div style={bubbleStyle}>
            <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>…</p>
          </div>
        )}

        {state === 'speaking' && (
          <div style={bubbleStyle}>
            <p style={{ margin: 0 }}>{reply}</p>
          </div>
        )}

        {state === 'confirming' && draft && (
          <div style={bubbleStyle}>
            <p style={{ margin: '0 0 6px', fontWeight: 500 }}>{reply}</p>
            <div style={draftCard}>
              {draft.type === 'expense' && (
                <>
                  <span style={draftRow}><b>{draft.description}</b></span>
                  <span style={draftRow}>{Number(draft.amount).toFixed(3)} TND</span>
                  <span style={{ ...draftRow, color: 'var(--muted-foreground)', fontSize: 11 }}>
                    {draft.category_name} · {draft.date}
                  </span>
                </>
              )}
              {draft.type === 'income' && (
                <>
                  <span style={draftRow}><b>{draft.source}</b></span>
                  <span style={draftRow}>{Number(draft.amount).toFixed(3)} TND</span>
                  <span style={{ ...draftRow, color: 'var(--muted-foreground)', fontSize: 11 }}>
                    {draft.is_recurring ? 'Recurring' : 'One-time'} · {draft.date}
                  </span>
                </>
              )}
              {draft.type === 'category' && (
                <>
                  <span style={draftRow}><b>{draft.name}</b></span>
                  <span style={draftRow}>Budget: {Number(draft.budget_amount).toFixed(3)} TND</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={handleConfirm} style={sendBtn}>Oui</button>
              <button onClick={handleDeny}    style={cancelBtn}>Non</button>
            </div>
          </div>
        )}

        {/* Avatar */}
        <div
          style={{
            filter: `drop-shadow(0 0 8px ${ringColor[state]}66)`,
            transition: 'filter 0.3s',
          }}
          title='Say "Nova" to activate'
        >
          <MascotAvatar state={state} />
        </div>

      </div>

      {showForm && draft && draft.type === 'expense' && categories.length > 0 && (
        <ManualEntryDialog
          categories={categories}
          initialValues={{
            description: draft.description,
            amount:      draft.amount,
            category_id: draft.category_id ?? undefined,
            date:        draft.date,
            source:      'voice',
          }}
          onCreated={() => {
            setShowForm(false)
            onExpenseSaved?.()
            postTaskFlow()  // 5s → "anything else?" → 10s → idle
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  )
}

// Styles 

const container: React.CSSProperties = {
  position: 'fixed', bottom: 24, right: 24, zIndex: 100,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
}

const bubbleStyle: React.CSSProperties = {
  background: 'var(--popover)', color: 'var(--popover-foreground)',
  borderRadius: 12, padding: '10px 14px', fontSize: 13,
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)', maxWidth: 240, textAlign: 'center',
}

const draftCard: React.CSSProperties = {
  background: 'var(--background)',
  borderRadius: 8, padding: '6px 10px',
  display: 'flex', flexDirection: 'column', gap: 2,
  border: '1px solid var(--border)',
}

const draftRow: React.CSSProperties = {
  display: 'block', fontSize: 12,
}

const sendBtn: React.CSSProperties = {
  flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
  cursor: 'pointer', background: 'var(--primary)', color: 'var(--primary-foreground)',
  border: 'none', width: '100%',
}

const cancelBtn: React.CSSProperties = {
  flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 12,
  cursor: 'pointer', background: 'transparent', color: 'var(--muted-foreground)',
  border: '1px solid var(--border)',
}
