<div align="center">

# ⚡ IntelliOps

**An AI-native operational intelligence platform unifying systems into a single operational layer.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
<br />
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
<br />
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-Core-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://sdk.vercel.ai/docs)
[![Zod](https://img.shields.io/badge/Zod-Validation-3068b7?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)

</div>

<br />

**IntelliOps** allows teams to upload system logs, database sheets, reports, and code documents, run advanced semantic queries grounded in their datasets, and monitor operational health through real-time telemetry.

---

## 🌟 Key Features

* **Advanced Hybrid RAG Pipeline:** Combines dense semantic vector retrieval with sparse keyword full-text search, fused using Reciprocal Rank Fusion (RRF) and scored via a custom LLM-based reranking system.
* **Multi-Format Ingestion Engine:** Asynchronously parses, chunks, and indexes a wide variety of operational formats: PDFs, CSV sheets, JSON payloads, plain text, and system log files (`.log`).
* **Real-time Telemetry Dashboard:** Tracks workspace metrics, workspace-wide storage details, ingestion stats, and logs detailed, real-time audit logs of workspace actions.
* **Multi-Tenant Workspaces:** Complete workspace isolation with role-based access control (RBAC), workspace switching, and teammate onboarding.
* **Modern Chat UI:** Implements a premium, full-bleed messaging interface featuring custom scrollbars, streaming AI completions, typing indicators, and inline source citation links.

---

## 🏗️ Architecture & How It Works

### 1. Data Ingestion Pipeline
When a user uploads a document, it goes through an asynchronous processing flow:

```text
[ File Upload ] 
       ↓
[ Storage Bucket ] 
       ↓
[ File Processor Worker ]
       ↓
( File Type Detection )
  ├── PDF  ➔ [ pdf-parse Extraction ]
  ├── CSV  ➔ [ PapaParse Tabular Extraction ]
  └── TXT  ➔ [ Structure-Aware Parsers ]
       ↓
[ Sliding-Window Sentence-Level Chunker ]
       ↓
[ NVIDIA Llama Nemotron Embeddings Batching ]
       ↓
[ Prisma Bulk Vector Insertion ]
```

* **Chunking & Overlapping:** Documents are split into segments matching paragraph and sentence boundaries. If a chunk exceeds `maxTokens` (512), it splits and uses a sliding window overlap of 64 tokens to preserve semantic context across chunk splits.
* **Vector Embeddings:** Chunk texts are grouped in batches of 25 and sent to the embedding model, slicing the dimensions to 1536 (MRL optimization) for dense vector search.

---

### 2. The Advanced RAG Retrieval Flow
To minimize hallucination and ensure precise matches for system variables and logs, query execution uses an advanced retrieval workflow:

```text
[ User Query ]
       ↓
[ LLM Query Rewriter ]
       ↓ (Expanded Query)
  ┌────┴────┐
  │         │
[ Dense ] [ Sparse FTS ]
  │         │ 
  └────┬────┘ (Top 15 Chunks Each)
       ↓
[ Reciprocal Rank Fusion (RRF) ]
       ↓ (Top 15 Merged)
[ LLM-Based Reranker ]
       ↓ (Top 6 Contexts)
[ Streamed Response Generator ]
```

1. **Query Rewriting:** The user's query is expanded using an LLM (e.g. converting *"why did deploy fail?"* into search terms like `"Error", "deployment", "pipeline aborted", "failed"`).
2. **Hybrid Search:**
   * **Dense Search:** Cosine-similarity matches using pgvector.
   * **Sparse Search:** Full-text search over text vectors using PostgreSQL's FTS engine.
3. **Reciprocal Rank Fusion (RRF):** Ranks are fused using the formula:
   $$RRF(d) = \frac{1}{60 + \text{rank}_{\text{dense}}(d)} + \frac{1}{60 + \text{rank}_{\text{sparse}}(d)}$$
4. **LLM Reranking:** The top 15 RRF candidates are scored (0–10) by a fast LLM helper to filter out noise and retain the top 6 most relevant contexts for the final system prompt.

---

## 🗄️ Database Architecture

The data layer is built on PostgreSQL using **Prisma ORM**, optimized for multi-tenancy and high-performance vector operations:

| Model | Key Fields | Purpose | Relations |
|-------|------------|---------|-----------|
| **User** | `clerkId`, `email`, `name`, `avatarUrl` | Synced from Clerk webhooks. One user can belong to many workspaces | WorkspaceMember, File, Conversation, AuditLog |
| **Workspace** | `name`, `slug (unique)`, `description` | Tenant boundary. All data is scoped to a workspace | WorkspaceMember, File, Conversation, AuditLog, Insight |
| **WorkspaceMember** | `role: OWNER/ADMIN/USER`, `joinedAt` | RBAC join table. Unique constraint on (workspaceId, userId) | Workspace, User |
| **File** | `status: QUEUED/PROCESSING/READY/FAILED`, `storageKey`, `fileType`, `sizeBytes`, `chunkCount` | Uploaded file record. storageKey maps to Supabase S3 object | Workspace, User, Chunk, Insight |
| **Chunk** | `content`, `chunkIndex`, `tokenCount`, `embedding vector(1536)`, `metadata (Json)` | Text segments with embeddings. Queried by pgvector for RAG retrieval | File |
| **Conversation** | `title`, `workspaceId`, `userId` | Container for a chat session between user and AI | Workspace, User, Message |
| **Message** | `role: user/assistant`, `content`, `sources (Json)` | Individual message. sources stores chunk IDs + similarity scores | Conversation |
| **Insight** | `type: FILE_SUMMARY/KEY_ISSUES/TREND/ANOMALY`, `content (Markdown)`, `isStale`, `metadata (Json)` | AI-generated structured insights. Linked to workspace or specific file | Workspace, File (optional) |
| **AuditLog** | `action`, `metadata (Json)`, `createdAt` | Immutable event log. Actions: file.upload, file.delete, member.invite, query.run, workspace.create | Workspace, User |

---

## 🔌 API Design

The backend utilizes Next.js 16 App Router API Routes (`/api/...`) following RESTful principles, edge-optimized runtimes, and Upstash Redis rate limiting.

### Workspaces & Members
* `POST /api/workspaces` - Create a new isolated workspace.
* `GET /api/workspaces` - List all workspaces accessible to the user.
* `GET /api/workspaces/[id]` - Retrieve details for a specific workspace.
* `PATCH /api/workspaces/[id]` - Update workspace settings.
* `DELETE /api/workspaces/[id]` - Delete a workspace and cascade delete its data.
* `GET /api/workspaces/[id]/members` - List all members and their roles in the workspace.
* `POST /api/workspaces/[id]/members` - Invite a new member to the workspace.
* `PATCH /api/workspaces/[id]/members/[uid]` - Update a member's role (e.g., USER to ADMIN).
* `DELETE /api/workspaces/[id]/members/[uid]` - Remove a member from the workspace.

### Files & Ingestion
* `POST /api/workspaces/[id]/files` - Generate secure pre-signed URLs for direct-to-S3 uploads and queue files for ingestion.
* `GET /api/workspaces/[id]/files` - List all ingested and processing files in the workspace.
* `GET /api/workspaces/[id]/files/[fid]` - Retrieve metadata for a specific file.
* `DELETE /api/workspaces/[id]/files/[fid]` - Delete a file and its associated vector chunks.

### AI Search & Chat
* `POST /api/workspaces/[id]/search` - Standalone endpoint for raw hybrid semantic queries (RRF) over indexed chunks.
* `POST /api/workspaces/[id]/conversations` - Create a new chat conversation thread.
* `GET /api/workspaces/[id]/conversations` - List all conversation threads.
* `GET /api/workspaces/[id]/conversations/[cid]` - Retrieve a specific conversation and its messages.
* `DELETE /api/workspaces/[id]/conversations/[cid]` - Delete a conversation history.
* `POST /api/workspaces/[id]/conversations/[cid]/messages` - Core RAG endpoint. Executes hybrid search, passes context to the LLM, and streams back the response via SSE.

### Insights & Telemetry
* `GET /api/workspaces/[id]/insights` - Fetch workspace-level AI-generated insights.
* `POST /api/workspaces/[id]/insights/generate` - Trigger an async job to generate insights/anomalies over workspace data.
* `GET /api/workspaces/[id]/files/[fid]/insights` - Retrieve file-specific generated insights.
* `GET /api/workspaces/[id]/stats` - Aggregate telemetry data (file counts, storage used, query volume) for the dashboard, optimized with Redis caching.

---

## 🔒 Security & Data Protection

* 🛡️ **Authentication:** Clerk JWT validated server-side on every protected route via `requireAuth()`.
* 🏢 **Role-Based Access Control (RBAC):** Workspace RBAC enforced in API middleware. Role hierarchy (`OWNER` > `ADMIN` > `USER`) is strictly verified on the server and never trusted from the client.
* ⚡ **Rate Limiting:** Sliding window rate limiters (via Upstash Redis) protect all AI and file upload endpoints against abuse and expensive DDoS patterns.
* ✅ **Input Validation:** Zod validation on all API inputs. Malformed requests are rejected at the boundary with a `400 Bad Request` error.
* 🔐 **Secure Uploads:** File uploads use secure pre-signed URLs, allowing direct-to-S3 object storage without passing large payloads through the Node.js server.
* 📜 **Immutable Audit Trails:** Every destructive or critical workspace action (e.g., `file.delete`, `member.invite`) is logged in an immutable `AuditLog` for compliance and observability.

---
## 🚀 Getting Started

### Prerequisites
* Node.js v18+
* PostgreSQL database instance with the `vector` extension enabled

### Environment Variables
Configure a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
OPENROUTER_API_KEY="sk-or-v1-..."
```

### Installation & Run
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Apply database schemas and run migrations:
   ```bash
   npx prisma db push
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 🛠️ Tech Stack & Libraries

* **Framework:** Next.js 16 (App Router · TypeScript strict)
* **Styling:** Tailwind CSS (Custom design tokens · Dark mode)
* **Database:** NeonDB (Postgres with pgvector extension for embeddings)
* **ORM:** Prisma (Type-safe queries · Migrations)
* **Authentication:** Clerk (JWT · Webhooks · RBAC)
* **AI / LLM:** OpenRouter (GPT OSS 20B)
* **AI Streaming:** Vercel AI SDK (streamText · StreamingTextResponse)
* **Cache + Rate Limits:** Upstash Redis (Sliding window limiters)
* **Object Storage:** Supabase S3 (S3-compatible API · Signed URLs)
* **Validation:** Zod (All API inputs validated)

---

## 🧠 Engineering Challenges Solved

This project was built to solve complex engineering challenges, demonstrating proficiency in full-stack architecture, asynchronous processing, and AI integrations:

### 1. Hybrid Search (RAG) Optimization
Achieving high relevance in semantic search required moving beyond simple vector similarity. I implemented **Reciprocal Rank Fusion (RRF)** to combine dense vector search with sparse full-text search (PostgreSQL FTS). A secondary LLM-based reranking step was added to eliminate hallucinated or loosely-related chunks, ensuring the final context window is highly accurate.

### 2. Intelligent Data Chunking
Processing large PDFs, CSVs, and logs sequentially blocks operations and leads to timeouts. The ingestion pipeline was designed to handle files efficiently, utilizing structural chunking (sentence and paragraph boundaries) with sliding window overlaps (64 tokens) to maintain semantic integrity without hitting LLM context limits.

### 3. Streaming AI Responses
To provide a premium, low-latency user experience, responses are streamed directly to the client using the **Vercel AI SDK**. The UI handles real-time markdown rendering and syntax highlighting (`react-markdown`, `react-syntax-highlighter`) without re-rendering the entire DOM tree, optimizing React's reconciliation process.

### 4. Scalable Multi-Tenant Architecture
Workspaces are strictly isolated at the database level. Each user operation, file upload, and query is verified against the user's workspace role and permissions via Clerk middleware and API checks.

---

## 📁 Project Structure Highlights

```text
├── app/
│   ├── (auth)/             # Authentication routes (Clerk)
│   ├── (dashboard)/        # Protected workspace routes
│   └── api/                # REST/Serverless endpoints & Webhooks
├── components/
│   ├── chat/               # Streaming chat interface & markdown renderers
│   └── ui/                 # Reusable, accessible UI components (Shadcn/Base UI)
├── lib/
│   ├── chunker.ts          # Advanced sliding-window text chunking algorithm
│   ├── file-processor.ts   # Multi-format parsing (PDF, CSV, Logs)
│   └── rag-pipeline.ts     # RRF fusion, dense/sparse search & LLM reranking
└── prisma/
    └── schema.prisma       # Database schema including pgvector mappings
```

---

