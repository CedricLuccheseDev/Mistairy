# Claude Code Guidelines - Mistairy

## Project Overview

Mistairy is a generic social deduction game engine inspired by Werewolf. Create custom roles and game modes through configuration files. Phones act as the narrator (TTS) and game interface.

> *Mystery + AI = Mistairy*

## Project Structure

```
Mistairy/
├── app/
│   ├── components/      # Vue components
│   │   └── night/       # Night phase sub-components (WerewolfAction, SeerAction, etc.)
│   ├── composables/     # Reusable logic (useGame, useNarrator, etc.)
│   ├── pages/           # Nuxt pages
│   ├── layouts/         # App layouts
│   └── assets/          # CSS, images, sounds
├── shared/
│   ├── config/          # Game configuration (game.config.ts)
│   └── types/           # TypeScript definitions (database.types.ts, game.ts)
├── server/
│   ├── api/             # Nuxt API routes
│   ├── services/        # Business logic (gameService.ts)
│   ├── game/            # Game logic helpers (phases, night, vote, etc.)
│   └── utils/           # Server utilities
├── supabase/
│   └── migrations/      # SQL migrations (single file: 001_initial_schema.sql)
├── tests/               # Test files
└── public/              # Static assets
```

## Tech Stack

- **Frontend**: Nuxt 3 / TypeScript / Nuxt UI
- **Backend**: Supabase (Realtime + RLS + Edge Functions)
- **Audio**: Web Speech API (browser TTS)
- **Deployment**: Dokploy + GitHub

## Code Style

### General
- Comments in English
- SOLID principles
- Avoid eslint-disable or @ts-ignore (exception: Supabase realtime type recursion)

### Imports
Use the `#shared` alias for shared types and config:
```typescript
import type { Database } from '#shared/types/database.types'
import { MIN_PLAYERS, MAX_PLAYERS } from '#shared/config/game.config'
```

### Naming Conventions
- camelCase for files, folders, variables
- PascalCase for components and types
- Descriptive names in French for game concepts (e.g., `loupGarou`, `voyante`, `sorciere`)

### Vue Components
- Script above template
- Max 100 lines per component
- Use Nuxt UI components

```vue
<script setup lang="ts">
/* --- Props --- */
/* --- Emits --- */
/* --- States --- */
/* --- Computed --- */
/* --- Methods --- */
/* --- Watchers --- */
/* --- Lifecycle --- */
</script>
```

### Composables
Use clear section separators:

```typescript
/* ═══════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   FETCH FUNCTIONS
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   REALTIME SUBSCRIPTIONS
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   COMPUTED PROPERTIES
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   LIFECYCLE
   ═══════════════════════════════════════════ */
```

## Game Roles (v1)

| Role | French | Power |
|------|--------|-------|
| werewolf | Loup-Garou | Votes to kill a villager at night |
| villager | Villageois | No special power |
| seer | Voyante | Sees one player's role per night |
| witch | Sorcière | 1 life potion + 1 death potion (single use) |
| hunter | Chasseur | Kills someone when dying |

## Game States

```
lobby → night → day → vote → (night | finished)
```

## Key Files

- `shared/config/game.config.ts` - Game constants (MIN/MAX_PLAYERS, DEFAULT_SETTINGS, ROLE_ACTIONS)
- `shared/types/database.types.ts` - Supabase database types (single source of truth)
- `shared/types/game.ts` - Game types and ROLES constant
- `app/composables/useGame.ts` - Main game logic and state (realtime subscriptions)
- `app/composables/useNarrator.ts` - TTS narrator management
- `server/services/gameService.ts` - Centralized business logic (players, votes, events)
- `server/game/phases.ts` - Phase transitions (night → day → vote)
- `server/api/game/` - Game API endpoints

## Anti-Cheat (RLS)

All sensitive game logic runs server-side via:
1. **Row Level Security (RLS)** - Players only see their own role
2. **Edge Functions** - Role distribution, vote counting
3. **Realtime subscriptions** - Filtered by player permissions

## Validation

**IMPORTANT: Run before every commit:**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

And check the README.md & CLAUDE.md if is it up to date.

## Git Commits

Use conventional commits without signatures:

```bash
# Good
git commit -m "feat: add night phase voting"
git commit -m "fix: narrator not speaking on iOS"

# Bad (don't add)
# 🤖 Generated with Claude Code
# Co-Authored-By: ...
```

## Common Patterns

### Supabase Realtime Subscription

```typescript
const channel = supabase
  .channel('game:' + gameCode)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'games',
    filter: `code=eq.${gameCode}`
  }, (payload) => {
    // Handle game state change
  })
  .subscribe()
```

### TTS Narrator

```typescript
const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  utterance.rate = 0.9
  speechSynthesis.speak(utterance)
}
```

## Testing Locally

```bash
# Start Supabase locally
npx supabase start

# Start Nuxt dev server
npm run dev

# Open multiple browser tabs to simulate players
```

## Database Modifications

**IMPORTANT:** All database schema changes must be made in `supabase/migrations/001_initial_schema.sql`. Do NOT create additional migration files. This single file is the source of truth for the database schema.

When modifying the schema:
1. Edit `001_initial_schema.sql` directly
2. Update `shared/types/database.types.ts` to match
3. Reset local database: `npx supabase db reset`

## Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_anon_key
SUPABASE_SECRET_KEY=your_service_key  # Server-side only (JWT signing key)
GEMINI_API_KEY=your_gemini_key        # For AI narration (optional)
```
