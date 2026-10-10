# RAGWORKS — Production Knowledge Workbench v3.2

[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg)](https://vitejs.dev/)
[![Embedding: BGE-Small-EN](https://img.shields.io/badge/Embedding-BAAI%2Fbge--small--en--v1.5-blue.svg)](https://huggingface.co/BAAI/bge-small-en-v1.5)
[![Reranker: MS-Marco-MiniLM](https://img.shields.io/badge/Reranker-CrossEncoder-orange.svg)](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2)
[![LLM: Gemini + Groq](https://img.shields.io/badge/LLM-Gemini%202.5%20%7C%20Groq-purple.svg)](https://deepmind.google/technologies/gemini/)

An enterprise-grade, high-precision **Retrieval-Augmented Generation (RAG) Knowledge Assistant and Developer Workbench**. Built with **Hybrid Vector + BM25 Keyword Search**, **Local CrossEncoder Reranking**, **Deterministic Triple-Layer Guardrails**, **SSE Token Streaming**, **Multi-Provider LLM Resilience (Gemini 2.5 Flash → Groq)**, **Redis Caching**, and an IDE-inspired **Dark Terminal Developer Workbench UI**.

---

## 1. System Architecture & Pipeline Flow

```
                                    [ REACT FRONTEND WORKBENCH ]
                                 (3-Zone Terminal IDE UI · Vite)
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
         POST /api/v1/documents/upload                       POST /api/v1/chat/stream
                        │                                      (SSE Token Streaming)
                        ▼                                               │
         [ Document Extraction & Cleaning ]                             ▼
           (pypdf, python-docx, cleaner)                    [ 1. Input Guardrails ]
                        │                                  (Injection / Jailbreak Filter)
                        ▼                                               │
         [ Recursive Token Chunking ]                                   ▼
          (CHUNK_SIZE=500, OVERLAP=50)                      [ 2. Query Processor ]
                        │                                  (Normalization & Term Clean)
                        ▼                                               │
         [ Local Vector Embedding ]                                     ▼
           (BAAI/bge-small-en-v1.5)                       [ 3. Bounded History Memory ]
                        │                                 (MAX_CONVERSATION_HISTORY=6)
                        ▼                                               │
         [ PostgreSQL + pgvector / SQLite ]                             ▼
         ┌───────────────────────────────┐                  [ 4. Hybrid Retrieval ]
         │ - Vector Cosine Distance      │ ◄─────────────── (Vector Search + BM25 FTS)
         │ - Full-Text tsvector GIN      │                              │
         └───────────────────────────────┘                              ▼
                                                            [ 5. Candidate Score Fusion ]
                                                             (0.6 Vector + 0.4 BM25)
                                                                        │
                                                                        ▼
                                                            [ 6. CrossEncoder Reranker ]
                                                             (ms-marco-MiniLM-L-6-v2)
                                                                        │
                                                                        ▼
                                                            [ 7. Relevance Selection ]
                                                             (Threshold + Hybrid Fallback)
                                                                        │
                                                                        ▼
                                                            [ 8. Retrieval Guardrail ]
                                                             (Non-Empty Context Check)
                                                                        │
                                                                        ▼
                                                            [ 9. Versioned Prompt ]
                                                             (Phase Numbering Integrity)
                                                                        │
                                                                        ▼
                                                            [ 10. Resilient LLM Engine ]
                                                             Primary: Gemini 2.5 Flash
                                                             Fallback: Groq Qwen/Llama
                                                                        │
                                                                        ▼
                                                            [ 11. Output Guardrail ]
                                                             (Leakage & Grounding Check)
                                                                        │
                                                                        ▼
                                                            [ 12. SSE Stream to React ]
```

---

## 2. Core Technical Capabilities

### 🔹 Hybrid Search & Score Fusion
Combines dense semantic vector search (`BAAI/bge-small-en-v1.5`, 384-dimensional normalized embeddings) with sparse lexical keyword matching (PostgreSQL `tsvector`/`tsquery` GIN index or SQLite tokenized substring matcher).
- **Weighted Score Combination**: $\text{Hybrid Score} = (0.6 \times \text{Vector Score}) + (0.4 \times \text{BM25 Score})$.
- **Domain Glossary Expansion**: Automatically expands known domain acronyms (e.g., `RCA` $\rightarrow$ `Root Cause Analysis`, `CAPA` $\rightarrow$ `Corrective and Preventive Action`) for keyword retrieval while preserving the exact user prompt for generation.

### 🔹 Local CrossEncoder Reranking & Sigmoidal Normalization
Evaluates top-20 hybrid candidates using a local CrossEncoder transformer model (`cross-encoder/ms-marco-MiniLM-L-6-v2`).
- **Sigmoidal Logit Transformation**: Raw cross-encoder logits are converted to normalized scores:
  $$\text{Score} = \frac{1}{1 + e^{-\text{logit}}}$$
- Ensures reranker scores are bounded in $[0.0, 1.0]$ for predictable relevance thresholding.

### 🔹 Relevance Thresholding & Hybrid Fallback Engine
- **Primary Threshold**: Chunks with reranker score $\ge 0.20$ pass directly into selected context.
- **Factual Recovery Fallback Rule**: If 0 chunks pass the primary threshold (common for short technical terms like `"What is CRUD?"`), the engine evaluates whether hybrid retrieval found high keyword/vector matches penalized by cross-encoder logits. A candidate is selected if:
  $$\text{Reranker Score} \ge 0.005 \quad \text{AND} \quad (\text{Vector} \ge 0.45 \lor \text{BM25} \ge 0.40 \lor \text{Hybrid} \ge 0.30)$$
- **Out-of-Domain Rejection**: Completely unrelated queries (e.g., `"What is the population of Japan?"`) produce reranker scores $< 0.0001$ and hybrid scores $= 0.00$, strictly setting selected context to `0` and returning *"I couldn't find enough relevant information..."*.

### 🔹 Triple-Layer Guardrail System
1. **Input Guardrail**: Deterministic pattern matching preventing prompt injection attacks, jailbreaks, system prompt extraction, and input character overflow.
2. **Retrieval Guardrail**: Validates that non-empty context passed relevance selection. If selected context count is `0`, triggers fallback without invoking the LLM.
3. **Output Guardrail**: Inspects generated LLM answers to prevent system prompt leakage or ungrounded responses.

### 5. Multi-Provider LLM Resilience & Automated Fallback
- **Primary Provider**: Gemini 2.5 Flash / Flash Lite (`GeminiProvider`).
- **Fallback Provider**: Groq Qwen 2.7B / Llama 3.3 (`GroqProvider`).
- Automatically switches to Groq if Gemini encounters 503 high demand, rate limits, API key quota depletion, 5xx server errors, or timeouts.

### 6. Real-Time SSE Token Streaming Protocol
Endpoint `/api/v1/chat/stream` streams tokens using Server-Sent Events (`text/event-stream`):
- `event: start` $\rightarrow$ Session initialized and conversation ID assigned.
- `event: sources` $\rightarrow$ Emits selected context sources, reranked candidate list, and retrieval latency.
- `event: token` $\rightarrow$ Streams text tokens progressively with provider attribution.
- `event: completion` $\rightarrow$ Emits final answer, full execution latency, and developer debug trace.
- `event: error` $\rightarrow$ Emits structured guardrail blocks or system error payloads.

### 7. Redis Caching & Document Invalidation
- **Deterministic SHA-256 Caching**: Hashes normalized query + conversation history to cache responses with a 1-hour TTL.
- **Cache Invalidation**: Automatically flushes all cached RAG keys (`rag:*`) whenever a document is uploaded, deleted, or re-processed.

### 8. RAGWORKS Developer Workbench UI
A 3-zone dark terminal workspace tailored for RAG engineering:
- **Left Zone (22%)**: Knowledge Base Sidebar displaying document count, chunk count, file list, upload modal, and system readiness badges.
- **Center Zone (56%)**: Main RAG Session Workspace with readable typography (16px body, 1.6 line height), Markdown rendering, collapsible query history, sources list, and terminal input (`rag>`).
- **Right Zone (22%)**: Retrieval Inspector showing pipeline execution checklist, RRF retrieval count, reranking score bars, and collapsed selected context preview.
- **Bottom Drawer**: Developer Debug Console rendering query trace, active provider, guardrails, performance breakdown, and full candidate evaluation trace table.

---

## 3. Project Directory Structure

```
RagChatbot/
├── backend/
│   ├── app/
│   │   ├── api/v1/               # API Router Endpoints
│   │   │   ├── chat.py           # /chat and /chat/stream endpoints
│   │   │   ├── documents.py      # /documents upload and list endpoints
│   │   │   ├── health.py         # /ready system health status
│   │   │   └── metrics.py        # /metrics observability dashboard
│   │   ├── cache/                # Redis Cache Manager
│   │   │   └── redis_client.py   # Redis SHA-256 caching & invalidation
│   │   ├── database/             # SQLAlchemy Engine & Session
│   │   │   └── session.py        # PostgreSQL / SQLite fallback engine
│   │   ├── models/               # Database Schemas
│   │   │   └── db.py             # Document, DocumentChunk, Message, Metric models
│   │   ├── rag/                  # Core RAG Engineering Modules
│   │   │   ├── chunking/         # Token & Text Chunker
│   │   │   ├── embeddings/       # BAAI/bge-small-en-v1.5 Embedding Service
│   │   │   ├── generation/       # Prompt Engine & LLM Providers (Gemini, Groq)
│   │   │   ├── guardrails/       # Input, Retrieval, Output Guardrail Services
│   │   │   ├── ingestion/        # PyPDF & Python-Docx Document Cleaners
│   │   │   ├── retrieval/        # Hybrid Search, RRF Fusion & CrossEncoder Reranker
│   │   │   └── query_processor.py# Query Normalization & Acronym Glossary
│   │   ├── schemas/              # Pydantic Request/Response Models
│   │   ├── services/             # Conversation & Metrics Services
│   │   ├── config.py             # Environment & App Settings
│   │   └── main.py               # FastAPI Application Entry Point
│   ├── tests/                    # Pytest Unit & Integration Test Suite
│   └── requirements.txt          # Python Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/           # React Terminal Workspace Components
│   │   │   ├── chat/             # Conversation Workspace & Markdown Answer
│   │   │   ├── debug/            # Debug Console & Candidate Trace Table
│   │   │   ├── evaluation/       # Benchmark Evaluation Modal
│   │   │   ├── knowledge/        # Knowledge Base Sidebar & Upload Modal
│   │   │   ├── layout/           # Non-Overlapping Header Navigation
│   │   │   ├── metrics/          # Observability Metrics Dashboard Modal
│   │   │   └── retrieval/        # Retrieval Inspector Trace Drawer
│   │   ├── services/             # Axios & SSE Fetch API Services
│   │   ├── types/                # TypeScript Interfaces & Schemas
│   │   ├── App.tsx               # Main Application Component
│   │   └── main.tsx              # React Entry Point
│   ├── package.json              # Frontend NPM Dependencies
│   └── vite.config.ts            # Vite Build Configuration
├── evaluation/                   # RAG Evaluation Suite
│   ├── benchmarks/               # Test Queries & Golden Documents
│   ├── metrics/                  # Precision, Recall, Faithfulness Metrics
│   └── run_evaluation.py         # Evaluation Runner Script
├── docker-compose.yml            # Multi-Container Deployment Manifest
├── Dockerfile                    # Backend Docker Container Build
├── .gitignore                    # Comprehensive Git Ignore Rules
└── README.md                     # Project Documentation
```

---

## 4. Environment Variables Reference (`.env`)

Create a `.env` file in the project root:

```env
# ==============================================================================
# LLM PROVIDER CREDENTIALS
# ==============================================================================
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b

# ==============================================================================
# DATABASE CONFIGURATION
# ==============================================================================
# PostgreSQL with pgvector extension (or local SQLite fallback ragdb.db if unavailable)
DATABASE_URL=postgresql+psycopg://raguser:ragpassword@localhost:5432/ragdb

# ==============================================================================
# REDIS CACHING & PERFORMANCE
# ==============================================================================
REDIS_URL=redis://localhost:6379/0
CACHE_TTL_SECONDS=3600
ENABLE_CACHE=true

# ==============================================================================
# EMBEDDING & RERANKER MODELS
# ==============================================================================
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384

RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2

# ==============================================================================
# HYBRID RETRIEVAL & RERANKING PARAMETERS
# ==============================================================================
VECTOR_WEIGHT=0.6
KEYWORD_WEIGHT=0.4
INITIAL_RETRIEVAL_K=20
RERANK_TOP_K=5
MIN_RELEVANCE_SCORE=0.20

# ==============================================================================
# CHUNKING & MEMORY DEFAULTS
# ==============================================================================
CHUNK_SIZE=500
CHUNK_OVERLAP=50
MAX_CONVERSATION_HISTORY=6
RAG_PROMPT_VERSION=v3

# ==============================================================================
# APPLICATION & OBSERVABILITY
# ==============================================================================
LOG_LEVEL=INFO
MAX_FILE_SIZE_MB=15
ENABLE_DEBUG_MODE=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

---

## 5. API Endpoints Reference

### Health & Readiness
- `GET /api/v1/ready`
  - Returns connection status for Database, pgvector, Redis, Embedding Model, Reranker Model, Primary LLM, and Fallback LLM.

### Document Management
- `GET /api/v1/documents`
  - Returns list of ingested documents, file types, creation timestamps, and chunk counts.
- `POST /api/v1/documents/upload`
  - Multipart file upload (`.pdf`, `.docx`, `.txt`). Extracts text, cleans formatting, generates BGE embeddings, indexes chunks into database, and invalidates Redis cache.
- `DELETE /api/v1/documents/{id}`
  - Deletes document and associated chunks from database and flushes Redis cache.

### RAG Chat & Streaming
- `POST /api/v1/chat`
  - Non-streaming synchronous chat completion. Returns generated answer, sources, retrieved candidates, metadata, and debug info.
- `POST /api/v1/chat/stream`
  - Server-Sent Events (SSE) streaming endpoint returning real-time tokens, source citations, candidate lists, and performance metrics.

### Observability & Metrics
- `GET /api/v1/metrics`
  - Returns aggregate operational metrics: total questions, average latency, P95 latency, token usage, cost estimation, provider breakdown, fallback count, guardrail blocks, and retrieval success rate.

---

## 6. Local Setup & Quickstart Guide

### Option A: Running Locally (Recommended for Development)

#### 1. Backend Setup
```bash
# Navigate to backend folder
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI Uvicorn Server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`

#### 2. Frontend Setup
```bash
# Open a new terminal in the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```
- **Frontend Workspace**: `http://localhost:5173`

---

### Option B: Running with Docker Compose

```bash
# Build and start all service containers (Backend, Frontend, PostgreSQL + pgvector, Redis)
docker-compose up --build
```
- **React Frontend**: `http://localhost:5173`
- **FastAPI Backend**: `http://localhost:8000`

---

## 7. Quality Assurance & Evaluation Suite

### Automated Unit & Integration Testing
Run the pytest test suite covering retrieval logic, guardrails, fallback providers, prompt formatting, and endpoints:
```bash
cd backend
python -m pytest tests -v
```

### RAG Benchmark Evaluation Suite
Run automated evaluation benchmarking retrieval recall, precision, MRR, answer faithfulness, and relevance:
```bash
python -m evaluation.run_evaluation
```

---

## 8. Version Control & Git Configuration (`.gitignore`)

The repository includes an optimized `.gitignore` preventing secret leaks, cache clutter, and virtual environment commits:

```gitignore
# Environment & Secrets
.env
*.env
.env.local

# Python Virtual Environments & Caches
__pycache__/
*.py[cod]
backend/venv/
.venv/
venv/

# Pytest & Coverage
.pytest_cache/
.coverage
htmlcov/

# Node & Frontend Build
frontend/node_modules/
frontend/dist/
frontend/.vite/

# Database & Local Storage
pgdata/
*.sqlite
*.db
ragdb.db

# Logs & Temporary Scratch Files
*.log
logs/
scratch/
.system_generated/

# IDEs & OS Files
.vscode/
.idea/
.DS_Store
Thumbs.db
```

---

## 9. License & Attribution

Built with ❤️ by the RAGWORKS Engineering Team. Released under the MIT License.
