# SpendSense

## Project Overview

![Python](https://img.shields.io/badge/Python-3.13-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-green) ![React](https://img.shields.io/badge/React-TypeScript-61DAFB) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-blue) ![Groq](https://img.shields.io/badge/Groq-LLM-orange) ![edge--tts](https://img.shields.io/badge/edge--tts-TTS-lightgrey)

SpendSense is a personal budget management web application. It helps users record their daily expenses and income, allocate monthly budgets per category, and monitor their financial activity through a dedicated dashboard.

Users can log an expense in three ways: scanning a paper receipt, speaking to a built-in voice assistant, or filling in a short manual form. Every entry flows through the same pipeline — text extraction, categorization, and persistence — so the budget stays consistent regardless of the input method.


## Features

- **Receipt scanning.** Upload a photo of a receipt; the OCR service detects the items, each item is categorized, and the user reviews the draft before saving. A single receipt produces one expense per category.
- **Voice assistant (Nova).** Say *"Nova"* to wake the assistant. Nova listens for your request, calls the appropriate tool (log expense, log income, create category, query spending), prepares a draft, and asks for confirmation before saving anything. The full conversation is stored per session so Nova can handle follow-up and amendments.
- **Expense and income tracking.** Expenses and incomes (one-off or recurring) can be created, edited, filtered by date range or category, and deleted.
- **Spending dashboard.** A visual summary of financial activity with filters for period and category.


## Technologies Used

| Layer | Technology |
|---|---|
| Backend | Python 3.13, FastAPI, SQLModel, Pydantic |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts |
| Database | PostgreSQL |
| OCR | Azure Document Intelligence — `prebuilt-receipt` model |
| LLM (Nova) | Groq — `openai/gpt-oss-20b` |
| Speech-to-text | Groq — `whisper-large-v3-turbo` |
| Text-to-speech | `edge-tts` — `en-US-JennyNeural` |
| Authentication | JWT tokens, PBKDF2-SHA256 password hashing |


## Project Structure

```
spendsense/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── api/                 # HTTP routes: auth, users, expenses, incomes,
│   │   │                        #   categories, receipts, budget, stores, voice
│   │   ├── services/            # Business logic: ocr, extraction, tts,
│   │   │                        #   voice_agent, tools, tool_executors, budget
│   │   ├── schemas/             # Pydantic models for API inputs/outputs
│   │   ├── models/              # SQLModel database models
│   │   └── core/                # Config, database, security, dependencies
│   ├── alembic/
│   │   ├── versions/            # Database migration scripts
│   │   └── env.py               # Migration environment
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Hash-based router
│   │   ├── pages/               # Landing, Auth, Dashboard, Overview, Manage, Settings
│   │   ├── components/          # UI components (charts, dialogs, mascot, filters)
│   │   ├── hooks/               # useHashRoute, useTheme
│   │   ├── lib/
│   │   │   ├── api.ts           # Fetch calls to the backend
│   │   │   └── overview.ts      # Dashboard aggregations
│   │   ├── styles/              # Global CSS
│   │   └── types.ts             # Shared TypeScript types
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Installation and Setup

### Prerequisites

- Python 3.13
- Node.js 20 or later
- PostgreSQL running locally
- A Groq API key
- An Azure Document Intelligence resource

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

Create a `.env` file in `backend/` by copying `.env.example`, then fill in the values:

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/spendsense
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
GROQ_API_KEY=<key from console.groq.com>
AZURE_DI_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
AZURE_DI_KEY=<KEY 1 from the Azure portal "Keys and Endpoint" page>
NOVA_MODEL=openai/gpt-oss-20b
```

Create the database and apply migrations:

```bash
createdb spendsense
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`. Interactive docs are at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is served on `http://localhost:5173`.

Set `VITE_API_URL` in `frontend/.env` if the backend is not on the default port:

```env
VITE_API_URL=http://localhost:8000
```

### Database migrations

Schema changes are managed with Alembic. After modifying a model in `app/models/`:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Review the generated file in `alembic/versions/` before applying it.

## Usage

1. **Create an account.** Open `http://localhost:5173`, click *Get started*, and fill in the sign-up form.

2. **Set up categories and budgets.** Go to *Manage → Categories* to add categories (e.g. *Food*, *Transport*, *Bills*) and set a monthly budget for each.

3. **Record income.** Go to *Manage → Incomes* to add a one-off or recurring income.

4. **Add an expense.** From *Manage → Expenses*, choose one of three input methods:
   - **Scan receipt** — upload a photo (JPEG, PNG, PDF; 4 MB max). Review the detected items, assign categories, and confirm.
   - **Manual entry** — fill in description, amount, category, and date.
   - **Voice (Nova)** — say *"Nova"* to activate the assistant. Describe what you want in English (e.g. *"I spent 12 dinars on groceries"*). Nova drafts the entry and asks for confirmation before saving.

5. **Review the dashboard.** Open *Overview* to see your financial activity. Use the filters to focus on a specific period or category.

## Nova — Voice Assistant

Nova is a voice-first financial assistant built on a ReAct agentic loop:

1. **Wake word** — Nova activates when it hears *"Nova"*.
2. **Listen** — Nova records the user's request and auto-stops after 1.5 seconds of silence.
3. **Reason & Act** — the LLM decides whether to call a tool (draft expense, draft income, draft category, get summary, get budget status, get recent transactions) or reply directly.
4. **Confirm** — drafts are staged as a `PendingTransaction` and shown to the user. Nova also listens for a voice confirmation so the user can say *"yes"*, *"no"*, or amend the draft by voice.
5. **Persist** — on confirmation the entry is written to the database; on rejection the draft is discarded and the conversation history is cleaned up.

Conversation history is stored in the `voicemessage` table (last 10 messages) and cleared automatically after 15 minutes of inactivity.
