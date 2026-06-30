'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  channel_id: string;
  channel_name: string;
  subscriber_count: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  shorts_count: number;
  avg_engagement: number;
  avg_views: number;
}

export default function Leaderboard({ days }: { days: number }) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetch(`/api/leaderboard?days=${days}`)
      .then(r => r.json())
      .then(setData);
  }, [days]);

  const fmt = (n: number) => {
    if (n >= 1000000) return (n/1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Channel Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="p-2 text-left text-gray-700 dark:text-gray-200">Channel</th>
              <th className="p-2 text-right text-gray-700 dark:text-gray-200">Subscribers</th>
              <th className="p-2 text-right text-gray-700 dark:text-gray-200">Views</th>
              <th className="p-2 text-right text-gray-700 dark:text-gray-200">Shorts</th>
              <th className="p-2 text-right text-gray-700 dark:text-gray-200">Avg Views</th>
              <th className="p-2 text-right text-gray-700 dark:text-gray-200">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {data.map((ch) => (
              <tr key={ch.channel_id} className="border-t dark:border-gray-700">
                <td className="p-2 font-medium text-gray-900 dark:text-white">{ch.channel_name}</td>
                <td className="p-2 text-right text-gray-600 dark:text-gray-300">{fmt(ch.subscriber_count)}</td>
                <td className="p-2 text-right text-gray-600 dark:text-gray-300">{fmt(ch.total_views)}</td>
                <td className="p-2 text-right text-gray-600 dark:text-gray-300">{ch.shorts_count}</td>
                <td className="p-2 text-right text-gray-600 dark:text-gray-300">{fmt(ch.avg_views)}</td>
                <td className="p-2 text-right text-gray-600 dark:text-gray-300">{ch.avg_engagement.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
