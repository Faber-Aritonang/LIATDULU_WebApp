# LIATDULU — Architecture Decision Record

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ UploadZone  │  │ ProductGrid │  │    ResultCanvas         │  │
│  │ (Model Photo)│ │ (Clothing)  │  │  (FASTA/Volume Control) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│           │             │                    │                  │
│           └──────┬──────┘                    │                  │
│                  ▼                         │                  │
│          ┌─────────────────┐               │                  │
│          │  FormData API   │ ◄─────────────┘                  │
│          └─────────────────┘                                  │
└────────────────────┬──────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS FUNCTION                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  POST /api/generate                                        │ │
│  │  1. Validate (imageProcessor.js)                           │ │
│  │  2. Composite (sharp)                                        │ │
│  │  3. Bynara API (bynara.js)                                 │ │
│  │  4. Trim/result (sharp)                                      │ │
│  │  5. Save to Blob (storage.js)                              │ │
│  │  6. Save to Postgres (db.js)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                             │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────┐  │
│  │  Bynara API  │  │ Vercel   │  │ Vercel       │  │ NextAuth │  │
│  │              │  │ Blob     │  │ KV (Rate L.) │  │         │  │
│  └──────────────┘  └──────────┘  └──────────────┘  └─────────┘  │
│                                 │                              │
│                                 ▼                              │
│                    ┌────────────────────────┐                   │
│                    │   Vercel Postgres      │                   │
│                    │   (User & History)     │                   │
│                    └────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Decisions

### ADR-001: Serverless Functions (Vercel) bukan Express Server
**Status:** Accepted | **Date:** 2026-01-04

**Alasan:**
- Zero server management, auto-scale, gratis tier cukup untuk MVP
- Deploy otomatis dari GitHub push
- Cold start acceptable untuk request fitting (~1-2 detik)
- Memory limit 1024MB cukup untuk sharp processing

**Konsekuensi:**
- Tidak ada persistent connection pooling
- Request timeout max 60 detik
- Bundle size harus dioptimalkan

### ADR-002: Bynara + Qwen Image 2.0 Pro bukan Gemini
**Status:** Accepted | **Date:** 2026-01-04

**Alasan:**
- Mendukung multi-image input native (image, image2, image3)
- Tidak perlu composite yang rumit di frontend
- Token Bynara sudah dimiliki oleh pengguna
- Qwen Image 2.0 Pro hasilnya lebih natural untuk produk

**Konsekuensi:**
- Bergantung pada uptime Bynara API
- Harus handle error rate limits dari Bynara

### ADR-003: Sharp untuk server-side image processing
**Status:** Accepted | **Date:** 2026-01-04

**Alasan:**
- Tidak ada DOM di Vercel Functions
- Sharp adalah library image processing Node.js paling performa
- Sudah battle-tested di lingkungan serverless
- Support untuk resize, crop, composite, trim black bars

**Konsekuensi:**
- Binary dependencies harus di-install proper (Vite build process)
- Memory usage tinggi saat processing (≈200MB per image)

### ADR-004: Vercel KV untuk rate limiting
**Status:** Accepted | **Date:** 2026-01-04

**Alasan:**
- Redis-compatible, terintegrasi native dengan Vercel
- Tidak perlu setup terpisah (seperti Redis Cloud)
- Gratis tier mencukupi untuk rate limiting MVP

**Konsekuensi:**
- Data tidak persist jika KV di-disable
- Query latency tambahan untuk setiap request

## Data Flow

```
Browser Workflow:
1. User upload model photo + clothing photos
2. Frontend creates FormData
3. POST /api/generate → Vercel Function
4. Validate file types/sizes (sharp)
5. Create composite image grid (sharp)
6. Send to Bynara API with prompt
7. Receive base64 result
8. Trim black bars (sharp)
9. Upload to Vercel Blob
10. Save metadata to Postgres (if authenticated)
11. Return { imageUrl, historyId }
12. Frontend renders result in ResultCanvas
```

## Environment Variables

| Variable | Description | Location |
|----------|-------------|----------|
| `BYNARA_API_KEY` | Bynara Router API key | Server-only |
| `NEXTAUTH_SECRET` | Secret untuk NextAuth JWT | Server-only |
| `NEXTAUTH_URL` | URL app (https://liatdulu.vercel.app) | Server-only |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Server-only |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Server-only |
| `POSTGRES_URL` | Vercel Postgres connection string | Server-only |
| `KV_REST_API_URL` | Vercel KV REST API URL | Server-only |
| `KV_REST_API_TOKEN` | Vercel KV REST API Token | Server-only |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token | Server-only |

## Known Limitations

- **Max file size:** 10MB per gambar
- **Max uploads:** 9 produk + 1 model = 10 gambar
- **Rate limit:** 10 requests/jam per userId atau IP
- **Function timeout:** 60 detik (batas Vercel)
- **Bynara response time:** ~15-30 detik
- **Composite grid:** Maks 3x3 slot (9 produk)

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/generate` | POST | Optional | Generate fitting result |
| `/api/history` | GET | Required | Get user history |
| `/api/history/[id]` | DELETE | Required | Delete history item |
| `/api/auth/[...nextauth]` | - | - | NextAuth handler |

## Frontend State Management

```javascript
// useGenerate hook state machine
const states = {
  IDLE: 'idle',        // Ready for upload
  UPLOADING: 'uploading', // File validation
  COMPOSITE: 'compositing', // Creating composite image
  PROCESSING: 'processing', // Sending to Bynara
  TRIMMING: 'trimming', // Post-processing result
  DONE: 'done',        // Result ready
  ERROR: 'error'       // Failed
};
```