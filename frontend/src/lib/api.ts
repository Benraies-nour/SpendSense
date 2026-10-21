import type { Category, Expense, Income } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Token management ──────────────────────────────────────────
const TOKEN_KEY = 'spendsense_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

// ── Auth ──────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (res.status === 401) throw new Error('Incorrect email or password.')
  if (!res.ok) throw new Error('Login failed.')
  const data = await res.json()
  setToken(data.access_token)
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  if (res.status === 400) throw new Error('Email already registered.')
  if (!res.ok) throw new Error('Sign up failed.')
  await res.json()
  // after signup, log in automatically to get the token
  await login(email, password)
}

// ── Profile ───────────────────────────────────────────────────
export type UserProfile = { id: number; email: string; name: string | null; createdAt: string }

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur chargement profil')
  const u = await res.json()
  return { id: u.id, email: u.email, name: u.name ?? null, createdAt: u.created_at.slice(0, 10) }
}

export async function updateProfile(data: { name?: string; email?: string }): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur mise à jour profil')
  const u = await res.json()
  return { id: u.id, email: u.email, name: u.name ?? null, createdAt: u.created_at.slice(0, 10) }
}

// ── Categories ────────────────────────────────────────────────
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories/`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur chargement catégories')
  const data = await res.json()
  return data.map((c: any) => ({ id: c.id, name: c.name, budgetAmount: Number(c.budget_amount).toFixed(3) }))
}

export async function createCategory(name: string, budgetAmount: string): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, budget_amount: budgetAmount }),
  })
  if (!res.ok) throw new Error('Erreur création catégorie')
  const c = await res.json()
  return { id: c.id, name: c.name, budgetAmount: Number(c.budget_amount).toFixed(3) }
}

export async function updateCategory(id: number, data: Partial<{ name: string; budgetAmount: string }>): Promise<Category> {
  const body: Record<string, unknown> = {}
  if (data.name !== undefined) body.name = data.name
  if (data.budgetAmount !== undefined) body.budget_amount = data.budgetAmount
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erreur mise à jour catégorie')
  const c = await res.json()
  return { id: c.id, name: c.name, budgetAmount: Number(c.budget_amount).toFixed(3) }
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur suppression catégorie')
}

// ── Expenses ──────────────────────────────────────────────────
export async function fetchExpenses(): Promise<Expense[]> {
  const res = await fetch(`${API_BASE}/expenses/`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur chargement dépenses')
  const data = await res.json()
  return data.map((e: any) => ({
    id: String(e.id),
    date: e.created_at.slice(0, 10),
    description: e.description ?? '',
    amount: Number(e.amount).toFixed(3),
    category: e.category_id,
    source: e.source,
    isRecurring: e.is_recurring,
    dueDay: e.due_day ?? null,
    receiptId: e.receipt_id ?? null,
  }))
}

export async function createExpense(payload: {
  category_id: number
  amount: string
  description: string
  source: 'manual' | 'voice' | 'receipt'
  is_recurring: boolean
  due_day: number | null
  date: string
}): Promise<Expense> {
  const res = await fetch(`${API_BASE}/expenses/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      category_id: payload.category_id,
      amount: payload.amount,
      description: payload.description,
      source: payload.source,
      is_recurring: payload.is_recurring,
      due_day: payload.due_day ?? undefined,
      created_at: `${payload.date}T00:00:00Z`,
    }),
  })
  if (!res.ok) throw new Error('Erreur création dépense')
  const e = await res.json()
  return {
    id: String(e.id),
    date: e.created_at.slice(0, 10),
    description: e.description ?? '',
    amount: Number(e.amount).toFixed(3),
    category: e.category_id,
    source: e.source,
    isRecurring: e.is_recurring,
    dueDay: e.due_day ?? null,
    receiptId: e.receipt_id ?? null,
  }
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur suppression dépense')
}

// ── Incomes ───────────────────────────────────────────────────
export async function fetchIncomes(): Promise<Income[]> {
  const res = await fetch(`${API_BASE}/incomes/`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur chargement revenus')
  const data = await res.json()
  return data.map((i: any) => ({
    id: String(i.id),
    date: i.received_at.slice(0, 10),
    description: i.source,
    amount: Number(i.amount).toFixed(3),
    isRecurring: i.is_recurring,
  }))
}

export async function createIncome(payload: {
  source: string; amount: string; receivedAt: string; isRecurring: boolean
}): Promise<Income> {
  const res = await fetch(`${API_BASE}/incomes/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ source: payload.source, amount: payload.amount, received_at: payload.receivedAt, is_recurring: payload.isRecurring }),
  })
  if (!res.ok) throw new Error('Erreur création revenu')
  const i = await res.json()
  return { id: String(i.id), date: i.received_at.slice(0, 10), description: i.source, amount: Number(i.amount).toFixed(3), isRecurring: i.is_recurring }
}

export async function updateIncome(id: string, data: Partial<{ source: string; amount: string; receivedAt: string; isRecurring: boolean }>): Promise<Income> {
  const body: Record<string, unknown> = {}
  if (data.source !== undefined) body.source = data.source
  if (data.amount !== undefined) body.amount = data.amount
  if (data.receivedAt !== undefined) body.received_at = data.receivedAt
  if (data.isRecurring !== undefined) body.is_recurring = data.isRecurring
  const res = await fetch(`${API_BASE}/incomes/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erreur mise à jour revenu')
  const i = await res.json()
  return { id: String(i.id), date: i.received_at.slice(0, 10), description: i.source, amount: Number(i.amount).toFixed(3), isRecurring: i.is_recurring }
}

export async function deleteIncome(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/incomes/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur suppression revenu')
}

// ── Receipts ──────────────────────────────────────────────────

export type DraftItem = {
  name: string
  quantity: string | null
  total_price: string
  category_id: number | null
}

export type ReceiptDraft = {
  purchased_at: string | null
  items: DraftItem[]
  computed_total: string
  printed_total: string | null
  extraction_method: 'ocr' | 'llm_fallback'
  ocr_text: string
}

export type ConfirmItem = {
  name: string
  quantity: string | null
  total_price: string
  category_id: number
}

export type ConfirmReceiptPayload = {
  purchased_at: string
  items: ConfirmItem[]
  ocr_text: string
}

export type ReceiptConfirmResponse = {
  receipt: { id: number; total: string; purchased_at: string; items: ConfirmItem[] }
  expenses_created: number
  budget_alerts: { category_id: number; category_name: string; over_by: string }[]
}

export type ReceiptItemDetail = {
  id: number
  name: string
  quantity: string | null
  total_price: string
  category_id: number | null
}

export type ReceiptDetail = {
  id: number
  purchased_at: string
  total: string
  items: ReceiptItemDetail[]
}

export async function fetchReceipt(id: number): Promise<ReceiptDetail> {
  const res = await fetch(`${API_BASE}/receipts/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Receipt not found.')
  return res.json()
}

export async function scanReceipt(file: File): Promise<ReceiptDraft> {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/receipts/scan`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (res.status === 413) throw new Error('File is too large (4 MB maximum).')
  if (res.status === 422) {
    const data = await res.json()
    throw new Error(data.detail ?? 'No items could be extracted. Try a clearer photo.')
  }
  if (res.status === 429) throw new Error('Monthly scan quota reached (500 pages).')
  if (!res.ok) throw new Error('Receipt analysis failed. Try again.')
  return res.json()
}

// ── Voice ─────────────────────────────────────────────────────

export type VoiceExpenseDraft = {
  type: 'expense'
  amount: string
  description: string
  category_id: number | null
  category_name: string
  date: string
}

export type VoiceIncomeDraft = {
  type: 'income'
  amount: string
  source: string
  date: string
  is_recurring: boolean
}

export type VoiceCategoryDraft = {
  type: 'category'
  name: string
  budget_amount: string
}

export type VoiceDraft = VoiceExpenseDraft | VoiceIncomeDraft | VoiceCategoryDraft

export type VoiceChatResponse = {
  reply_text: string
  audio_b64: string
  draft: VoiceDraft | null
}

export async function voiceChat(text: string): Promise<VoiceChatResponse> {
  const res = await fetch(`${API_BASE}/voice/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('Voice chat failed.')
  return res.json()
}

export async function confirmReceipt(payload: ConfirmReceiptPayload): Promise<ReceiptConfirmResponse> {
  const res = await fetch(`${API_BASE}/receipts/confirm`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail ?? 'Failed to save receipt.')
  }
  return res.json()
}

export async function clearVoiceHistory(): Promise<void> {
  await fetch(`${API_BASE}/voice/history`, { method: 'DELETE', headers: authHeaders() })
}
