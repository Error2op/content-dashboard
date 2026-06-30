import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

/**
 * Backfill yesterday's view snapshots so that daily gains show from today.
 * Uses batch INSERT for speed.
 */
async function backfillYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  console.log(`Backfilling daily_view_snapshots for ${yesterdayStr}...`);

  // Get all current video views from content_analytics
  const result = await db.execute({
    sql: `SELECT channel_id, channel_name, video_id, views FROM content_analytics`,
    args: [],
  });

  if (result.rows.length === 0) {
    console.log('No videos found in content_analytics. Run sync first.');
    return;
  }

  console.log(`Found ${result.rows.length} videos to backfill`);

  // Batch insert in groups of 50 using transaction
  const batch = result.rows as any[];
  const batchSize = 50;

  for (let i = 0; i < batch.length; i += batchSize) {
    const chunk = batch.slice(i, i + batchSize);
    // Use a single INSERT with VALUES list
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const args: any[] = [];
    for (const row of chunk) {
      args.push(row.channel_id, row.channel_name, row.video_id, yesterdayStr, row.views || 0);
    }

    await db.execute({
      sql: `INSERT INTO daily_view_snapshots (channel_id, channel_name, video_id, snapshot_date, views)
            VALUES ${placeholders}
            ON CONFLICT(video_id, snapshot_date) DO UPDATE SET views = excluded.views`,
      args,
    });

    if (i + batchSize < batch.length) {
      process.stdout.write(`\rProgress: ${i + chunk.length}/${batch.length}`);
    }
  }

  console.log(`\nBackfilled ${batch.length} video snapshots for ${yesterdayStr}`);
}

backfillYesterday().catch(console.error);
