const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function youtubeFetch(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY!);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API error: ${res.status} - ${err}`);
  }
  return res.json();
}

export async function getChannelInfo(handle: string): Promise<{
  channelId: string;
  name: string;
  uploadsPlaylistId: string;
  subscriberCount: number;
} | null> {
  // forHandle doesn't support contentDetails — must fetch in two calls
  const data = await youtubeFetch('channels', {
    part: 'snippet,statistics',
    forHandle: handle,
  });

  if (!data.items || data.items.length === 0) return null;

  const ch = data.items[0];
  const cdData = await youtubeFetch('channels', {
    part: 'contentDetails',
    id: ch.id,
  });

  const uploadsPlaylistId = cdData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return null;

  return {
    channelId: ch.id,
    name: ch.snippet.title,
    uploadsPlaylistId,
    subscriberCount: parseInt(ch.statistics.subscriberCount || '0', 10),
  };
}

export async function getLatestVideoIds(uploadsPlaylistId: string, maxResults = 25): Promise<string[]> {
  const data = await youtubeFetch('playlistItems', {
    part: 'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });

  if (!data.items) return [];
  return data.items.map((item: any) => item.contentDetails.videoId);
}

export async function getVideoMetrics(videoIds: string[]): Promise<any[]> {
  const allVideos: any[] = [];
  // YouTube API allows up to 50 video IDs per call
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await youtubeFetch('videos', {
      part: 'snippet,contentDetails,statistics',
      id: batch.join(','),
    });

    if (data.items) {
      allVideos.push(...data.items);
    }

    // Small delay to avoid hitting rate limits
    if (i + 50 < videoIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return allVideos;
}

export function isShort(video: any): boolean {
  const duration = parseDuration(video.contentDetails?.duration || 'PT0S');
  // Shorts are 60 seconds or less
  if (duration <= 60) return true;
  // Also check for #shorts hashtag as fallback
  const title = (video.snippet?.title || '').toLowerCase();
  const desc = (video.snippet?.description || '').toLowerCase();
  return title.includes('#shorts') || desc.includes('#shorts');
}

export function formatVideoForDB(video: any, channelId: string, channelName: string) {
  const stats = video.statistics || {};
  const duration = parseDuration(video.contentDetails?.duration || 'PT0S');
  const views = parseInt(stats.viewCount || '0', 10);
  const likes = parseInt(stats.likeCount || '0', 10);
  const comments = parseInt(stats.commentCount || '0', 10);
  const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

  return {
    channel_id: channelId,
    channel_name: channelName,
    video_id: video.id,
    title: video.snippet?.title || '',
    thumbnail_url: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '',
    published_at: video.snippet?.publishedAt || '',
    duration_seconds: duration,
    views,
    likes,
    comments,
    engagement_rate: Math.round(engagementRate * 100) / 100,
  };
}
