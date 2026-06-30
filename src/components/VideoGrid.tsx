'use client';

import { useEffect, useState } from 'react';

interface Video {
  video_id: string;
  channel_name: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  engagement_rate: number;
}

export default function VideoGrid({ channelId, days, sortBy, onSortChange }: {
  channelId: string;
  days: number;
  sortBy: string;
  onSortChange: (s: string) => void;
}) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/videos?days=${days}&channelId=${channelId}&sortBy=${sortBy}`)
      .then(r => r.json())
      .then(setVideos)
      .finally(() => setLoading(false));
  }, [channelId, days, sortBy]);

  const fmt = (n: number) => {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Shorts</h2>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="border dark:border-gray-600 rounded px-3 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white"
        >
          <option value="views">Views</option>
          <option value="likes">Likes</option>
          <option value="comments">Comments</option>
          <option value="engagement_rate">Engagement Rate</option>
        </select>
      </div>
      {loading ? <p className="text-gray-500 dark:text-gray-400">Loading...</p> : (
        <div className="space-y-3">
          {videos.map((v) => (
            <div key={v.video_id} className="flex gap-3 border-b dark:border-gray-700 pb-3">
              <img src={v.thumbnail_url} alt="" className="w-32 h-20 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-gray-900 dark:text-white">{v.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{v.channel_name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(v.published_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right text-sm text-gray-600 dark:text-gray-300">
                <p>{fmt(v.views)} views</p>
                <p>{fmt(v.likes)} likes</p>
                <p>{v.engagement_rate.toFixed(2)}% eng</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
