import { useEffect, useState } from 'react'
import { fetchProfile, updateProfile, type UserProfile } from '../lib/api'
import { demoUser } from '../mocks/demoAccount'

export function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')
  const [form, setForm] = useState({ name: '', email: '' })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProfile()
      .then(p => { setProfile(p); setForm({ name: p.name ?? '', email: p.email }); setStatus('ok') })
      .catch(() => {
        const fallback: UserProfile = { id: 1, email: demoUser.email, name: demoUser.name, createdAt: '2026-01-01' }
        setProfile(fallback)
        setForm({ name: fallback.name ?? '', email: fallback.email })
        setStatus('ok')
      })
  }, [])

  function handleChange(field: 'name' | 'email', value: string) {
    setForm(p => ({ ...p, [field]: value }))
    setDirty(true)
    setSaved(false)
    setSaveError('')
  }

  async function handleSave() {
    if (!dirty) return
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateProfile({ name: form.name || undefined, email: form.email || undefined })
      setProfile(updated)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') return (
    <div style={{ color: 'var(--color-text-muted)', fontSize: 14, padding: '40px 0' }}>Loading…</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 560 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Manage your account preferences.</p>
      </div>

      {/* Profile card */}
      <section style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Profile</h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Your name and email address.</p>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="Name">
            <input
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Your name"
              style={inputStyle}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Member since">
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {profile?.createdAt ?? '—'}
            </span>
          </Field>

          {/* Save row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              style={{
                padding: '8px 20px', borderRadius: 7, border: 'none',
                background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: !dirty || saving ? 'not-allowed' : 'pointer',
                opacity: !dirty || saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span style={{ fontSize: 12, color: '#10b981' }}>Saved.</span>}
            {saveError && <span style={{ fontSize: 12, color: '#f43f5e' }}>{saveError}</span>}
          </div>

        </div>
      </section>

    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 7,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}
