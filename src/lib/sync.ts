import { getDb } from './db';
import { getChannelInfo, getLatestVideoIds, getVideoMetrics, isShort, formatVideoForDB } from './youtube';

export async function syncChannel(handle: string, name: string): Promise<{ shorts: number; errors: string[] }> {
  const errors: string[] = [];

  try {
    const info = await getChannelInfo(handle);
    if (!info) {
      errors.push(`Channel not found: ${handle}`);
      return { shorts: 0, errors };
    }

    const db = getDb();

    await db.execute({
      sql: `INSERT INTO channels (channel_id, handle, name, subscriber_count, uploads_playlist_id, last_synced_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(channel_id) DO UPDATE SET
              subscriber_count = excluded.subscriber_count,
              last_synced_at = excluded.last_synced_at`,
      args: [info.channelId, handle, info.name, info.subscriberCount, info.uploadsPlaylistId],
    });

    const videoIds = await getLatestVideoIds(info.uploadsPlaylistId, 25);
    if (videoIds.length === 0) return { shorts: 0, errors };

    const videos = await getVideoMetrics(videoIds);
    const shorts = videos.filter(isShort);

    for (const short of shorts) {
      const record = formatVideoForDB(short, info.channelId, info.name);
      await db.execute({
        sql: `INSERT INTO content_analytics
              (channel_id, channel_name, video_id, title, thumbnail_url, published_at, duration_seconds, views, likes, comments, engagement_rate)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(channel_id, video_id) DO UPDATE SET
                title = excluded.title,
                thumbnail_url = excluded.thumbnail_url,
                views = excluded.views,
                likes = excluded.likes,
                comments = excluded.comments,
                engagement_rate = excluded.engagement_rate,
                synced_at = datetime('now')`,
        args: [
          record.channel_id, record.channel_name, record.video_id,
          record.title, record.thumbnail_url, record.published_at,
          record.duration_seconds, record.views, record.likes,
          record.comments, record.engagement_rate
        ],
      });

      // Take daily view snapshot
      const today = new Date().toISOString().split('T')[0];
      await db.execute({
        sql: `INSERT INTO daily_view_snapshots (channel_id, channel_name, video_id, snapshot_date, views)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(video_id, snapshot_date) DO UPDATE SET views = excluded.views`,
        args: [info.channelId, info.name, record.video_id, today, record.views],
      });
    }

    return { shorts: shorts.length, errors };
  } catch (err: any) {
    errors.push(err.message || String(err));
    return { shorts: 0, errors };
  }
}

export async function syncAllChannels(channels: { handle: string; name: string }[]): Promise<{ totalShorts: number; errors: string[] }> {
  let totalShorts = 0;
  const allErrors: string[] = [];

  for (const { handle, name } of channels) {
    const result = await syncChannel(handle, name);
    totalShorts += result.shorts;
    allErrors.push(...result.errors);
    await new Promise(r => setTimeout(r, 2000));
  }

  return { totalShorts, errors: allErrors };
}
