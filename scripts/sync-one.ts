import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@libsql/client';

const libsql = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
const YT = 'https://www.googleapis.com/youtube/v3';

async function ytFetch(endpoint: string, params: Record<string,string>) {
  const url = new URL(`${YT}/${endpoint}`);
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY!);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YT ${res.status}: ${await res.text()}`);
  return res.json();
}

const parseDur = (iso: string) => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? parseInt(m[1]||'0')*3600 + parseInt(m[2]||'0')*60 + parseInt(m[3]||'0') : 0;
};

async function main() {
  const chData = await ytFetch('channels', { part: 'snippet,statistics', id: 'UCi4VJ5Z_X8zS6Lg-_Gxzdjg' });
  const ch = chData.items[0];
  console.log('Channel:', ch.snippet.title, '| Subs:', ch.statistics.subscriberCount);

  const cdData = await ytFetch('channels', { part: 'contentDetails', id: 'UCi4VJ5Z_X8zS6Lg-_Gxzdjg' });
  const uploads = cdData.items[0].contentDetails.relatedPlaylists.uploads;

  await libsql.execute({ sql: `INSERT INTO channels (channel_id, handle, name, subscriber_count, uploads_playlist_id, last_synced_at) VALUES (?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(channel_id) DO UPDATE SET subscriber_count=excluded.subscriber_count, last_synced_at=excluded.last_synced_at`, args: [ch.id, 'Capital.io1', ch.snippet.title, ch.statistics.subscriberCount, uploads] });

  const plData = await ytFetch('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: '25' });
  const ids = plData.items.map((i: any) => i.contentDetails.videoId).filter(Boolean);
  const vData = await ytFetch('videos', { part: 'snippet,contentDetails,statistics', id: ids.join(',') });

  const shorts = vData.items.filter((v: any) => {
    const d = parseDur(v.contentDetails?.duration || 'PT0S');
    return d <= 60 || (v.snippet?.title||'').toLowerCase().includes('#shorts');
  });

  for (const s of shorts) {
    const st = s.statistics || {};
    const views = parseInt(st.viewCount||'0');
    const likes = parseInt(st.likeCount||'0');
    const comments = parseInt(st.commentCount||'0');
    const er = views > 0 ? Math.round(((likes+comments)/views)*10000)/100 : 0;
    await libsql.execute({ sql: `INSERT INTO content_analytics (channel_id, channel_name, video_id, title, thumbnail_url, published_at, duration_seconds, views, likes, comments, engagement_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(channel_id, video_id) DO UPDATE SET views=excluded.views, likes=excluded.likes, comments=excluded.comments, engagement_rate=excluded.engagement_rate, synced_at=datetime('now')`, args: [ch.id, ch.snippet.title, s.id, s.snippet?.title||'', s.snippet?.thumbnails?.medium?.url||'', s.snippet?.publishedAt||'', parseDur(s.contentDetails?.duration||'PT0S'), views, likes, comments, er] });
  }
  console.log('Capital io:', shorts.length, 'shorts synced');

  const kpi = await libsql.execute('SELECT COUNT(*) as c, SUM(views) as v FROM content_analytics');
  console.log('Total in DB:', kpi.rows[0].c, 'shorts |', kpi.rows[0].v, 'views');
}

main().catch(console.error);