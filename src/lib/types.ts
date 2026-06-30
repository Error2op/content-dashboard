export interface Channel {
  handle: string;
  name: string;
}

export interface ChannelData {
  channel_id: string;
  handle: string;
  name: string;
  subscriber_count: number;
  uploads_playlist_id: string;
  last_synced_at: string;
}

export interface VideoRecord {
  id: number;
  channel_id: string;
  channel_name: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
  duration_seconds: number;
  views: number;
  likes: number;
  comments: number;
  engagement_rate: number;
  synced_at: string;
}

export interface KPIData {
  total_views: number;
  avg_views_per_short: number;
  engagement_rate: number;
  total_subscribers: number;
  total_likes: number;
  total_comments: number;
  shorts_count: number;
}

export interface LeaderboardEntry {
  channel_id: string;
  channel_name: string;
  subscriber_count: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  shorts_count: number;
  avg_engagement_rate: number;
  avg_views: number;
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  likes: number;
  comments: number;
}
