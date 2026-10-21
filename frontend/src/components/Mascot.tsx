import { useEffect, useRef, useState } from 'react'
import type { Category } from '../types'
import { fetchCategories, voiceChat } from '../lib/api'
import type { VoiceDraft } from '../lib/api'
import { ManualEntryDialog } from './ManualEntryDialog'

type MascotState = 'idle' | 'listening' | 'thinking' | 'confirming' | 'speaking'

type Props = {
  onExpenseSaved?: () => void
}

export function Mascot({ onExpenseSaved }: Props) {
  const [state, setState]           = useState<MascotState>('idle')
  const [transcript, setTranscript] = useState('')
  const [reply, setReply]           = useState('')
  const [draft, setDraft]           = useState<VoiceDraft | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm]     = useState(false)

  const stateRef       = useRef<MascotState>('idle')
  const recognitionRef = useRef<any>(null)
  useEffect(() => { stateRef.current = state }, [state])

  // ── SpeechRecognition — wake word "Nova" ─────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) { console.warn('SpeechRecognition not supported.'); return }

    let recognition: any = null
    let stopped = false

    async function start() {
      try { await navigator.mediaDevices.getUserMedia({ audio: true }) }
      catch { console.warn('Microphone permission denied.'); return }
      if (stopped) return

      recognition = new SR()
      recognitionRef.current     = recognition
      recognition.continuous     = true
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        const last = event.results[event.results.length - 1]
        const text = last[0].transcript.toLowerCase().trim()

        if (stateRef.current === 'idle' && text.includes('nova')) {
          setState('speaking')
          setReply('Hi! I\'m Nova, your assistant. I\'m listening — how can I help you?')
          playGreeting(() => {
            setReply('')
            setState('listening')
            setTranscript('')
            try { recognitionRef.current?.start() } catch (_) {}
          })
          return
        }

        if (stateRef.current === 'listening') {
          setTranscript(last[0].transcript.trim())
        }
      }

      recognition.onend = () => {
        if (stopped) return
        // Keep recognition alive while idle (wake word) or listening (active transcription)
        if (stateRef.current === 'idle' || stateRef.current === 'listening') {
          setTimeout(() => { if (!stopped) try { recognition.start() } catch (_) {} }, 500)
        }
      }

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') { console.warn('Mic not allowed'); return }
        if (e.error === 'aborted' || e.error === 'network') return
        console.error('recognition error:', e.error)
      }

      recognition.start()
    }

    start()
    return () => { stopped = true; recognition?.stop() }
  }, [])

  // ── Send to backend ───────────────────────────────────────────
  async function handleSend() {
    if (!transcript.trim()) return
    const text = transcript
    setState('thinking')
    setTranscript('')

    try {
      const result = await voiceChat(text)

      // Play Nova's audio reply
      const bytes = Uint8Array.from(atob(result.audio_b64), c => c.charCodeAt(0))
      const url   = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      const audio = new Audio(url)

      if (result.draft) {
        // Nova detected an expense — show confirmation UI
        setDraft(result.draft)
        setReply(result.reply_text)
        setState('confirming')
        audio.onended = () => URL.revokeObjectURL(url)
      } else {
        // Conversational reply — play, then keep listening for the user's next turn
        setState('speaking')
        setReply(result.reply_text)
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setReply('')
          setTranscript('')
          setState('listening')
          try { recognitionRef.current?.start() } catch (_) {}
        }
      }

      audio.play()
    } catch {
      setState('idle')
    }
  }

  // ── Confirm → open the right form based on the draft type ───
  async function handleConfirm() {
    if (!draft) return

    if (draft.type === 'expense') {
      try {
        const cats = categories.length > 0 ? categories : await fetchCategories()
        setCategories(cats)
      } catch { /* use whatever is already loaded */ }
      setState('idle')
      setReply('')
      setShowForm(true)
      return
    }

    // Income or category: navigate to the right sub-tab, pre-fill via sessionStorage
    sessionStorage.setItem('nova_draft', JSON.stringify(draft))
    const targetTab = draft.type === 'income' ? 'incomes' : 'categories'
    window.location.hash = '#/app/manage'
    window.dispatchEvent(new CustomEvent('nova-set-manage-tab', { detail: targetTab }))
    setDraft(null)
    setReply('')
    setState('idle')
  }

  // ── Deny ──────────────────────────────────────────────────────
  function handleDeny() {
    setDraft(null)
    setReply('')
    setTranscript('')
    setState('listening')
    try { recognitionRef.current?.start() } catch (_) {}
  }

  function handleCancel() {
    setState('idle')
    setTranscript('')
  }

  function playGreeting(onEnd: () => void) {
    const msg = 'Hi! I\'m Nova, your assistant. I\'m listening — how can I help you?'
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(msg)
      utter.lang = 'en-US'
      utter.rate = 1
      utter.onend = onEnd
      window.speechSynthesis.speak(utter)
    } else {
      setTimeout(onEnd, 2000)
    }
  }

  // ── Ring color ────────────────────────────────────────────────
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

        {state === 'listening' && (
          <div style={bubbleStyle}>
            <p style={{ margin: '0 0 8px', minHeight: 18 }}>
              {transcript || 'Je t\'écoute…'}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleSend}   style={sendBtn}>Envoyer</button>
              <button onClick={handleCancel} style={cancelBtn}>Annuler</button>
            </div>
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
            width: 64, height: 64, borderRadius: '50%',
            border: `3px solid ${ringColor[state]}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--popover)',
            boxShadow: state !== 'idle' ? `0 0 12px ${ringColor[state]}88` : '0 2px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
          title={state === 'idle' ? 'Dis "Nova" pour activer' : undefined}
        >
          <span style={{ fontSize: 32 }}>🐨</span>
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
            setDraft(null)
            onExpenseSaved?.()
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────

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
  border: 'none',
}

const cancelBtn: React.CSSProperties = {
  flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 12,
  cursor: 'pointer', background: 'transparent', color: 'var(--muted-foreground)',
  border: '1px solid var(--border)',
}
