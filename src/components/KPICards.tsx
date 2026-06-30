'use client';

import { useEffect, useState } from 'react';

interface KPIData {
  total_views: number | null;
  avg_views: number | null;
  avg_engagement: number | null;
  shorts_count: number | null;
  total_likes: number | null;
  total_comments: number | null;
}

export default function KPICards({ channelId, days }: { channelId: string; days: number }) {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/kpi?days=${days}&channelId=${channelId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [channelId, days]);

  const formatNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  const cards = [
    { label: 'Total Views', value: formatNumber(data?.total_views) },
    { label: 'Avg Views/Short', value: formatNumber(data?.avg_views) },
    { label: 'Engagement Rate', value: ((data?.avg_engagement || 0)).toFixed(2) + '%' },
    { label: 'Total Shorts', value: formatNumber(data?.shorts_count) },
    { label: 'Total Likes', value: formatNumber(data?.total_likes) },
    { label: 'Total Comments', value: formatNumber(data?.total_comments) },
  ];

  if (loading) {
    return <div className="grid grid-cols-2 lg:grid-cols-6 gap-4"><p className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">Loading KPIs...</p></div>;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
