# Contributing to Mistairy

## Prerequisites

- Node.js 20+
- A Supabase account (free tier works)

## Setting Up Your Development Environment

### 1. Clone the Repository

```bash
git clone git@github.com:CedricLuccheseDev/Mistairy.git
cd Mistairy
```

### 2. Set Up Supabase

You need your own Supabase instance to run the project locally.

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the script: [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
4. Get your credentials from Project Settings > API:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (anon key)
   - `SUPABASE_SECRET_KEY` (service role key)

### 3. Install & Configure

```bash
npm install
cp .env.example .env
```

Edit `.env` with your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key  # Optional
```

### 4. Run Development Server

```bash
npm run dev
```

Open multiple browser tabs to simulate players.

## Development Workflow

1. Create a branch from `dev`: `git checkout -b feature/your-feature`
2. Make changes following [code standards](CLAUDE.md)
3. Test your changes locally
4. Run validation: `npm run lint && npm run typecheck && npm run build`
5. Commit with conventional format
6. Push and create a PR targeting `dev`

## Commit Convention

Format: `type: description`

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

### Examples
```
feat: add witch role night action
fix: narrator not speaking on iOS
docs: update game rules
```

## Pull Requests

- Target the `dev` branch
- Describe your changes clearly
- Ensure CI passes (lint, typecheck, build, tests)
- One feature/fix per PR

## Testing

```bash
# Run tests
npm run test

# Run lint
npm run lint

# Type check
npm run typecheck
```

## Need Help?

Open an issue on GitHub if you have questions.
