import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Add daily_view_snapshots table for tracking daily view gains
  await db.execute(`CREATE TABLE IF NOT EXISTS daily_view_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    video_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    UNIQUE(video_id, snapshot_date)
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_snapshot_date ON daily_view_snapshots(snapshot_date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_snapshot_video ON daily_view_snapshots(video_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_snapshot_channel ON daily_view_snapshots(channel_id)`);

  console.log('Migration complete: daily_view_snapshots table created');
}

main().catch(console.error);
