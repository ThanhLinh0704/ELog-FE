 # ELog Delivery Management System

Electronics logistics delivery management for Vietnam SME — single warehouse, fixed routes, store delivery.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |

*Note: The backend service (Java 21, Spring Boot 3.x, MySQL 8.x) runs in a separate repository.*

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
# Check or configure VITE_API_BASE_URL in .env.development (default: http://localhost:8080)

# 3. Run frontend development server
npm run dev
```

The frontend app will run on `http://localhost:5173` (or the port specified by Vite).
Ensure the backend service is running (default: `http://localhost:8080`) to perform API calls.

---

## Git Workflow

### Branch naming

```
feature/US-{n}-{short-desc}     # new feature, e.g. feature/US-02-jwt-auth
bugfix/US-{n}-{short-desc}      # bug fix tied to a user story
hotfix/{short-desc}             # urgent production fix
chore/{short-desc}              # config, deps, CI, tooling
```

### Flow

```
main  ←── (PR + 1 review required)
  └── develop  ←── (PRs from feature/bugfix branches)
        └── feature/US-xx-...
```

- All feature work targets `develop`.
- `main` is protected: direct push is blocked; PR + 1 reviewer required.
- Never commit secrets, generated files, or `node_modules`.

---

## Project Structure

```
ELog-FE/ (Frontend Workspace)
├── public/           Static assets
├── src/              Vite + React 19 + TypeScript source
│   ├── api/          Axios instance & API integrations
│   ├── components/   Reusable UI components (empty skeleton)
│   ├── pages/        Page views (Login, Dashboard, NotFound)
│   ├── store/        Redux slices (empty skeleton)
│   ├── hooks/        Custom React hooks (empty skeleton)
│   ├── types/        TypeScript type definitions (empty skeleton)
│   ├── utils/        Utility helpers (empty skeleton)
│   ├── App.tsx       App routing (using react-router-dom v7)
│   └── main.tsx      Entry point
├── docs/             Architecture, API, and business rules documentation
├── .env.development  Environment variables (baseURL, etc.)
├── package.json      Dependencies (React 19, Vite, AntD v6, Axios, Redux, etc.)
└── vite.config.ts    Vite configuration
```

---

*SEP490_G104 · ELog · Sprint 1*
