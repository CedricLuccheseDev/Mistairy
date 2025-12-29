# Claude Code Guidelines - Loup Garou

## Project Overview

Online Werewolf game designed for playing with friends IRL. Phones act as the narrator (TTS) and game interface, eliminating the need for physical cards or a human narrator.

## Project Structure

```
LoupAgrou/
├── app/
│   ├── components/      # Vue components
│   ├── composables/     # Reusable logic (useGame, useNarrator, etc.)
│   ├── pages/           # Nuxt pages
│   ├── layouts/         # App layouts
│   ├── types/           # TypeScript definitions
│   └── assets/          # CSS, images, sounds
├── server/
│   └── api/             # Nuxt API routes
├── supabase/
│   └── migrations/      # SQL migrations
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
- No eslint-disable or type:ignore

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

- `composables/useGame.ts` - Main game logic and state
- `composables/useNarrator.ts` - TTS narrator management
- `composables/useSupabase.ts` - Supabase client wrapper
- `server/api/game/` - Game API endpoints
- `supabase/functions/distribute-roles/` - Secure role distribution

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

## Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key  # Server-side only
```
