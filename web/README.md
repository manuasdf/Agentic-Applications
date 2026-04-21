# AutoCV Web UI

A web-based interface for the AutoCV AI-powered resume and cover letter generator.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
  - All user data (profiles, jobs, settings) stored in browser localStorage
  - PDF preview using browser-native `<object>` tag and iframe
  
- **Backend**: FastAPI (Python)
  - Minimal API with 3 main endpoints: `/api/scrape`, `/api/ai/*`, `/api/compile`
  - Acting as a proxy for AI calls (to hide API keys) and LaTeX→PDF compilation
  - Serves static frontend files in production

## Project Structure

```
web/
├── backend/           # FastAPI application
│   ├── main.py       # FastAPI app entry point
│   ├── routes/       # API route definitions
│   │   ├── scrape.py  # Web scraping endpoint
│   │   ├── ai.py      # AI generation endpoints
│   │   └── compile.py # LaTeX→PDF compilation
│   ├── models.py      # Pydantic schemas
│   └── requirements.txt
│
└── frontend/         # React SPAs
    ├── src/
    │   ├── pages/     # Page components
    │   ├── components/# Reusable UI components
    │   ├── hooks/     # Custom React hooks
    │   ├── services/  # API service layer
    │   ├── types/     # TypeScript type definitions
    │   ├── App.tsx    # Main app with routing
    │   └── main.tsx   # Entry point
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

## Setup

### Prerequisites

- Python 3.8+
- Node.js 18+
- LaTeX distribution (pdflatex) for PDF generation
  - Ubuntu/Debian: `sudo apt-get install texlive-full`
  - macOS: Install MacTeX or TeX Live
  - Windows: Install MiKTeX or TeX Live

### Backend Setup

```bash
# Navigate to backend directory
cd web/backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy existing source to Python path or install in development mode
# The backend imports from src/ directory

# Run the FastAPI server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`
API docs: `http://localhost:8000/api/docs`

### Frontend Setup

```bash
# Navigate to frontend directory
cd web/frontend

# Install dependencies
npm install

# Run development server with proxy to backend
npm run dev
```

The frontend will be available at `http://localhost:5173`
The Vite dev server will proxy `/api` requests to the backend at `http://localhost:8000`

## Usage

1. **Home Page** (`/`): Submit a job posting URL and select your candidate profile
2. **Analysis Page** (`/analyze`): Review job analysis and fit percentage
3. **Review Page** (`/review`): Preview and download generated documents
4. **Settings Page** (`/settings`): Manage API keys and app settings

## Environment Configuration

Create a `.env` file in the `web/backend/` directory with your API keys:

```bash
MISTRAL_API_KEY=your_mistral_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
# ... other provider keys
```

Or configure them in the Settings page of the frontend.

## Production Deployment

### Build Frontend

```bash
cd web/frontend
npm run build
```

This creates a `dist/` directory with production-ready files.

### Run Backend with Static Files

The FastAPI backend is configured to serve static files from `frontend/dist/` when available.

```bash
# From web/backend directory
uvicorn main:app --port 8000
```

Now the app will be served from `http://localhost:8000` with all routes handled by FastAPI.

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for LaTeX
RUN apt-get update && apt-get install -y texlive-full

# Copy backend files
COPY web/backend/ /app/backend/
COPY src/ /app/src/

# Install Python dependencies
COPY web/backend/requirements.txt .
RUN pip install -r requirements.txt

# Build frontend
RUN apt-get install -y nodejs npm
COPY web/frontend/ /app/frontend/
WORKDIR /app/frontend
RUN npm install && npm run build

# Run FastAPI
WORKDIR /app
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Key Features

1. **Client-Side Storage**: All user data stored in browser localStorage
2. **Privacy First**: No data sent to external servers except for AI processing
3. **AI Proxy**: Backend acts as proxy to hide API keys from frontend
4. **PDF Generation**: Server-side LaTeX→PDF compilation using pdflatex
5. **Browser-Native Preview**: PDFs displayed using `<object>` tag for native browser PDF viewer
6. **Responsive Design**: Mobile-friendly UI with Tailwind CSS
7. **Extensible**: Easy to add new AI providers or features

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scrape` | Extract text from job posting URL |
| POST | `/api/ai/analyze-job` | Analyze job posting with AI |
| POST | `/api/ai/generate-cv` | Generate CV LaTeX |
| POST | `/api/ai/generate-cover-letter` | Generate Cover Letter LaTeX |
| POST | `/api/ai/generate-email` | Generate Email content |
| POST | `/api/compile` | Compile LaTeX to PDF (returns base64) |
| POST | `/api/compile-raw` | Compile LaTeX to PDF (returns raw PDF) |
| GET | `/api/health` | Health check |

## Technical Notes

- The frontend uses React Router for client-side navigation
- API calls are proxied through Vite during development and through FastAPI in production
- PDF compilation requires a LaTeX compiler (pdflatex) on the server
- For very large PDFs, consider using the `/api/compile-raw` endpoint for streaming
