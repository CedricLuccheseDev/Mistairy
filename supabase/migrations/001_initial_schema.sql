-- Drop existing tables if they exist (reset)
DROP TABLE IF EXISTS game_events CASCADE;
DROP TABLE IF EXISTS day_ready CASCADE;
DROP TABLE IF EXISTS day_votes CASCADE;
DROP TABLE IF EXISTS night_actions CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS games CASCADE;

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'intro', 'night', 'day', 'vote', 'hunter', 'finished')),
  phase_end_at TIMESTAMPTZ,
  day_number INTEGER NOT NULL DEFAULT 0,
  winner VARCHAR(20) CHECK (winner IN ('village', 'werewolf')),
  settings JSONB NOT NULL DEFAULT '{"discussion_time": 180, "vote_time": 60, "night_time": 30}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  host_id UUID,
  hunter_target_pending UUID
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('werewolf', 'villager', 'seer', 'witch', 'hunter')),
  is_alive BOOLEAN NOT NULL DEFAULT true,
  is_host BOOLEAN NOT NULL DEFAULT false,
  witch_heal_used BOOLEAN NOT NULL DEFAULT false,
  witch_kill_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign keys after players table exists
ALTER TABLE games ADD CONSTRAINT games_host_id_fkey FOREIGN KEY (host_id) REFERENCES players(id);
ALTER TABLE games ADD CONSTRAINT games_hunter_target_pending_fkey FOREIGN KEY (hunter_target_pending) REFERENCES players(id);

-- Night actions table
CREATE TABLE night_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('werewolf_vote', 'seer_look', 'witch_heal', 'witch_kill', 'witch_skip', 'hunter_kill')),
  target_id UUID REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, day_number, player_id, action_type)
);

-- Day votes table
CREATE TABLE day_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  voter_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, day_number, voter_id)
);

-- Day ready table (players ready to vote)
CREATE TABLE day_ready (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, day_number, player_id)
);

-- Game events table for narrator history
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_night_actions_game_day ON night_actions(game_id, day_number);
CREATE INDEX idx_day_votes_game_day ON day_votes(game_id, day_number);
CREATE INDEX idx_day_ready_game_day ON day_ready(game_id, day_number);
CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_games_code ON games(code);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_ready ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Games policies (full access)
CREATE POLICY "games_select" ON games FOR SELECT USING (true);
CREATE POLICY "games_insert" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "games_update" ON games FOR UPDATE USING (true);
CREATE POLICY "games_delete" ON games FOR DELETE USING (true);

-- Players policies (full access)
CREATE POLICY "players_select" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update" ON players FOR UPDATE USING (true);
CREATE POLICY "players_delete" ON players FOR DELETE USING (true);

-- Night actions policies (full access)
CREATE POLICY "night_actions_select" ON night_actions FOR SELECT USING (true);
CREATE POLICY "night_actions_insert" ON night_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "night_actions_update" ON night_actions FOR UPDATE USING (true);
CREATE POLICY "night_actions_delete" ON night_actions FOR DELETE USING (true);

-- Day votes policies (full access)
CREATE POLICY "day_votes_select" ON day_votes FOR SELECT USING (true);
CREATE POLICY "day_votes_insert" ON day_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "day_votes_update" ON day_votes FOR UPDATE USING (true);
CREATE POLICY "day_votes_delete" ON day_votes FOR DELETE USING (true);

-- Day ready policies (full access)
CREATE POLICY "day_ready_select" ON day_ready FOR SELECT USING (true);
CREATE POLICY "day_ready_insert" ON day_ready FOR INSERT WITH CHECK (true);
CREATE POLICY "day_ready_update" ON day_ready FOR UPDATE USING (true);
CREATE POLICY "day_ready_delete" ON day_ready FOR DELETE USING (true);

-- Game events policies (full access)
CREATE POLICY "game_events_select" ON game_events FOR SELECT USING (true);
CREATE POLICY "game_events_insert" ON game_events FOR INSERT WITH CHECK (true);
CREATE POLICY "game_events_update" ON game_events FOR UPDATE USING (true);
CREATE POLICY "game_events_delete" ON game_events FOR DELETE USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE day_ready;

-- Set REPLICA IDENTITY FULL on players to get full row data in DELETE events
ALTER TABLE players REPLICA IDENTITY FULL;
