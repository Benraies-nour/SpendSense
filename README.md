# SpendSense

**Live app:** [spend-sense-teal.vercel.app](https://spend-sense-teal.vercel.app) &nbsp;·&nbsp; **API:** [spendsense-yak7.onrender.com](https://spendsense-yak7.onrender.com/docs)

## Project Overview

SpendSense is a personal budget management web application. It helps users record their daily expenses, allocate monthly budgets per category, and monitor their financial activity through a dedicated dashboard.

Users can log an expense in three different ways: scanning a paper receipt, speaking to a built-in voice assistant, or filling in a short manual form. Every entry flows through the same pipeline — text extraction, categorization, and persistence — so the budget stays consistent regardless of the input method.

All monetary values are expressed in Tunisian dinars (TND) with three decimal places (millimes).

## Features

- **Receipt scanning.** Upload a photo of a receipt; the OCR service detects the items, each item is categorized, and the user reviews the draft before saving. A single receipt produces one expense per category, so category budgets stay accurate.
- **Voice expense entry.** A voice assistant named Nova listens for a wake word, transcribes the user's speech, prepares a draft expense, income, or category, and asks for confirmation before saving.
- **Category-based budgets.** Each category holds a fixed monthly budget in TND; the dashboard displays the amount spent and remaining per category, and raises a warning when a budget is exceeded.
- **Expense and income tracking.** Expenses and incomes (one-off or recurring) can be created, edited, filtered by date range, category, or source, and deleted.
- **Budget queries.** Natural-language questions such as "how much have I spent on groceries this month?" are answered by the voice assistant using live data from the database.
- **Spending dashboard.** A visual summary of the user's financial activity, with filters to focus on a specific period or category.
- **Multilingual input.** The user interface is in English, but voice and text inputs accept French, Arabic, and Tunisian Darija, including mixed-language messages.

## Technologies Used

| Layer | Technology |
|---|---|
| Backend | Python 3.13, FastAPI, SQLModel, Pydantic |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts |
| Database | PostgreSQL 18 |
| OCR | Azure Document Intelligence — `prebuilt-receipt` model (free tier F0) |
| LLM | Groq — `openai/gpt-oss-120b` |
| Speech-to-text | Groq — `whisper-large-v3` |
| Text-to-speech | `edge-tts` — voices `fr-FR-DeniseNeural` and `ar-TN-ReemNeural` |
| Authentication | JWT tokens, PBKDF2-SHA256 password hashing |
| Testing | pytest with Azure and Groq clients mocked |

## Project Structure

```
spendsense/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── api/                 # HTTP routes: auth, users, expenses, incomes,
│   │   │                        #   categories, receipts, budget, stores, voice
│   │   ├── services/            # Business logic: ocr, extraction, budget, tts, tools
│   │   ├── schemas/             # Pydantic models for API inputs and outputs
│   │   ├── models/              # SQLModel database models
│   │   └── core/                # Configuration, database, security, dependencies
│   ├── alembic/
│   │   ├── versions/            # Database migration scripts
│   │   └── env.py               # Migration environment (reads DATABASE_URL from .env)
│   ├── alembic.ini
│   ├── tests/
│   │   ├── test_ocr.py          # OCR service tests (Azure mocked)
│   │   ├── test_extraction.py   # LLM extraction tests (Groq mocked)
│   │   └── fixtures/receipts/   # Saved Azure JSON responses used by tests
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
├── docs/
│   └── receipt-scanning-plan.md
└── README.md
```

## Installation and Setup

### Prerequisites

- Python 3.13
- Node.js 20 or later
- PostgreSQL 18 running locally
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
SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(32))">
GROQ_API_KEY=<key from console.groq.com>
AZURE_DI_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
AZURE_DI_KEY=<KEY 1 from the Azure portal "Keys and Endpoint" page>
```

Create the PostgreSQL database once:

```bash
createdb spendsense
```

Apply the database migrations:

```bash
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload
```

The API is served on `http://localhost:8000`. Interactive OpenAPI docs are available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/` if the backend is not on the default URL:

```env
VITE_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

The web application is served on `http://localhost:5173`.

### Database migrations

Schema changes are managed with Alembic, not with automatic table creation. After modifying a model in `app/models/`, generate and apply a migration:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Review the generated file in `alembic/versions/` before applying it — autogenerate is a starting point, not a guarantee.

### Running the tests

```bash
cd backend
pytest tests/
```

The tests mock the Azure and Groq clients, so no network calls are made and no quota is consumed.

## Usage

1. **Create an account.** Open `http://localhost:5173`, click *Get started* on the landing page, and fill in the sign-up form. Logging in afterwards stores a JWT in the browser.

2. **Set up categories and budgets.** Go to *Manage → Categories* to add categories (for example *Food*, *Transport*, *Bills*) and set a monthly budget in TND for each one.

3. **Record an income.** Go to *Manage → Incomes* to add a one-off income or a recurring one such as a monthly salary.

4. **Add an expense.** From *Manage → Expenses*, choose one of three input methods:
   - **Scan receipt** — select or capture a photo (JPEG, PNG, BMP, TIFF, HEIF, or PDF; 4 MB maximum). The dialog displays a draft with the detected items, their quantities, and prices. Assign a category to each item, correct any value if needed, then confirm. One expense per category is created in a single transaction.
   - **Manual entry** — fill in the description, amount, category, date, and optional recurrence day.
   - **Voice** — say *"Nova"* to activate the assistant, then describe the expense in French, Arabic, or Darija (for example *"j'ai payé 12.500 dinars de pain"*). Confirm the draft Nova proposes and the expense is saved.

5. **Review the dashboard.** Open the *Overview* page to review your financial activity. Use the filters at the top to pick the period and categories you want to focus on.
