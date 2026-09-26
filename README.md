# LIATDULU - Virtual Fitting Room

Virtual Fitting Room web application that allows users to virtually try on clothing using AI.

## Tech Stack

- **Frontend:** React 18 + Vite 5
- **Backend:** Vercel Serverless Functions (Node.js 20)
- **AI Provider:** Bynara Router API (qwen-image-2.0-pro)
- **Storage:** Vercel Blob + Vercel KV
- **Auth:** NextAuth.js v5 (Google OAuth + Email Magic Link)
- **Database:** Vercel Postgres

## Quick Start

```bash
# Clone and install
git clone https://github.com/Faber-Aritonang/LIATDULU_WebApp
cd LIATDULU_WebApp
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

## Project Structure

```
LIATDULU_WebApp/
├── api/                     # Vercel Serverless Functions
│   ├── _lib/                # Shared utilities
│   ├── generate.js          # Main fitting endpoint
│   ├── history.js           # History GET endpoint
│   ├── history-delete.js    # History DELETE endpoint
│   └── auth/                # NextAuth handlers
├── src/                     # React Frontend
│   ├── components/          # UI Components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── styles/              # CSS styles
│   └── App.jsx              # Main app component
├── migrations/              # Database migrations
├── PROGRESS.md              # Development progress tracker
├── ARCHITECTURE.md          # Architecture decisions
└── .env.example             # Environment variables template
```

## Development Phases

### Phase 0: Setup & Foundation ✅
- Project initialization
- Vite + React setup
- Environment configuration

### Phase 1: Backend Core ✅
- Custom error classes
- Bynara API client
- Image processing (sharp)
- Rate limiting
- Storage integration
- Generate endpoint

### Phase 2: Frontend Refactor ✅
- Constants and utilities
- Component library
- Custom hooks

### Phase 3: Auth & Database ✅
- Database client
- Authentication system
- NextAuth.js integration

### Phase 4: History Feature ✅
- History endpoints
- History panel component

### Phase 5: Polish & Deploy
- Error boundaries
- Mobile responsiveness
- Production deployment

## Environment Variables

See `.env.example` for all required environment variables.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate fitting result |
| `/api/history` | GET | Get user history |
| `/api/history/[id]` | DELETE | Delete history entry |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/[...nextauth]` | -- | NextAuth handler |

## Database Schema

See `migrations/001_initial.sql` for the complete schema.

## License

MIT