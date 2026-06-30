import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';
import channels from '../channels.json';

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return parseInt(m[1]||'0')*3600 + parseInt(m[2]||'0')*60 + parseInt(m[3]||'0');
}

async function ytFetch(endpoint: string, params: Record<string,string>) {
  const url = new URL(`${YOUTUBE_API}/${endpoint}`);
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY!);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YT API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function syncChannel(handle: string, name: string, channelId?: string) {
  try {
    let chData: any;
    // Support both handle-based and ID-based lookups
    if (channelId) {
      chData = await ytFetch('channels', { part: 'snippet,statistics', id: channelId });
    } else {
      chData = await ytFetch('channels', { part: 'snippet,statistics', forHandle: handle });
    }
    if (!chData.items?.length) { console.log(`NOT FOUND: ${handle}`); return 0; }
    const ch = chData.items[0];
    
    const cdData = await ytFetch('channels', { part: 'contentDetails', id: ch.id });
    const uploads = cdData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) { console.log(`${handle}: No uploads`); return 0; }

    await libsql.execute({
      sql: `INSERT INTO channels (channel_id, handle, name, subscriber_count, uploads_playlist_id, last_synced_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(channel_id) DO UPDATE SET subscriber_count=excluded.subscriber_count, last_synced_at=excluded.last_synced_at`,
      args: [ch.id, handle, ch.snippet.title, ch.statistics.subscriberCount||'0', uploads],
    });

    const plData = await ytFetch('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: '25' });
    if (!plData.items?.length) return 0;

    const ids = plData.items.map((i: any) => i.contentDetails.videoId).filter(Boolean);
    const vData = await ytFetch('videos', { part: 'snippet,contentDetails,statistics', id: ids.join(',') });
    if (!vData.items?.length) return 0;

    const shorts = vData.items.filter((v: any) => {
      const dur = parseDuration(v.contentDetails?.duration || 'PT0S');
      return dur <= 60 || (v.snippet?.title||'').toLowerCase().includes('#shorts');
    });

    for (const s of shorts) {
      const stats = s.statistics || {};
      const views = parseInt(stats.viewCount||'0');
      const likes = parseInt(stats.likeCount||'0');
      const comments = parseInt(stats.commentCount||'0');
      const er = views > 0 ? Math.round(((likes+comments)/views)*10000)/100 : 0;

      await libsql.execute({
        sql: `INSERT INTO content_analytics (channel_id, channel_name, video_id, title, thumbnail_url, published_at, duration_seconds, views, likes, comments, engagement_rate)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(channel_id, video_id) DO UPDATE SET views=excluded.views, likes=excluded.likes, comments=excluded.comments, engagement_rate=excluded.engagement_rate, synced_at=datetime('now')`,
        args: [ch.id, ch.snippet.title, s.id, s.snippet?.title||'', s.snippet?.thumbnails?.medium?.url||'', s.snippet?.publishedAt||'', parseDuration(s.contentDetails?.duration||'PT0S'), views, likes, comments, er],
      });

      // Take daily view snapshot
      const today = new Date().toISOString().split('T')[0];
      await libsql.execute({
        sql: `INSERT INTO daily_view_snapshots (channel_id, channel_name, video_id, snapshot_date, views)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(video_id, snapshot_date) DO UPDATE SET views = excluded.views`,
        args: [ch.id, ch.snippet.title, s.id, today, views],
      });
    }
    console.log(`${name}: ${shorts.length} shorts synced`);
    return shorts.length;
  } catch (err: any) {
    console.error(`${handle} ERROR: ${err.message}`);
    return 0;
  }
}

async function main() {
  let total = 0;
  for (const { handle, name, channel_id } of channels as any[]) {
    total += await syncChannel(handle, name, channel_id);
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`Done. Total shorts: ${total}`);
}

main().catch(console.error);
