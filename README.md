# Mistairy

A generic social deduction game engine inspired by Werewolf. Create custom roles and game modes through configuration files. Phones act as the narrator (TTS) and game interface.

> *Mystery + AI = Mistairy*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## Features

- Real-time multiplayer using Supabase Realtime
- Text-to-Speech narrator (Web Speech API)
- Anti-cheat with Row Level Security (players can't see others' roles)
- Multiple roles: Werewolf, Villager, Seer, Witch, Hunter
- Mobile-friendly UI

## Quick Start

> See [Contributing Guide](CONTRIBUTING.md) for full setup instructions.

```bash
npm install
npm run dev
```

## Project Structure

```
Mistairy/
├── app/
│   ├── components/     # Vue components
│   ├── composables/    # Reusable logic (useGame, useNarrator)
│   ├── pages/          # Nuxt pages
│   └── assets/         # CSS, sounds
├── server/
│   ├── api/            # API routes
│   ├── services/       # Business logic
│   └── game/           # Game logic (phases, votes)
├── shared/
│   ├── config/         # Game configuration
│   └── types/          # TypeScript types
├── supabase/           # Database migrations
└── tests/              # Test files
```

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript, Nuxt UI
- **Backend**: Supabase (Realtime + RLS)
- **Audio**: Web Speech API (browser TTS)

## Game Roles

| Role | Power |
|------|-------|
| Werewolf | Votes to kill a villager at night |
| Villager | No special power |
| Seer | Sees one player's role per night |
| Witch | 1 life potion + 1 death potion |
| Hunter | Kills someone when dying |

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) first.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See [LICENSE](LICENSE) for details.
