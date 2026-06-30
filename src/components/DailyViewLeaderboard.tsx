'use client';

import { useEffect, Fragment, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DailyData {
  date: string;
  channels: { channel_id: string; channel_name: string; views: number }[];
  total_views: number;
}

export default function DailyViewLeaderboard({ days }: { days: number }) {
  const [data, setData] = useState<DailyData[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/daily-views?days=${days}`)
      .then(r => r.json())
      .then(setData);
  }, [days]);

  const fmt = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Chart data: sorted oldest → newest
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      date: formatDate(d.date),
      totalViews: d.total_views,
    }));

  return (
    <div className="space-y-6">
      {/* Daily Views Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Daily Views Over Time</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(v: number) => fmt(v)}
                axisLine={{ stroke: '#374151' }}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb',
                }}
                formatter={(value: unknown) => [fmt(Number(value) || 0), 'Views Gained']}
              />
              <Line
                type="monotone"
                dataKey="totalViews"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#ef4444' }}
                activeDot={{ r: 6, fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No daily view data yet. Sync data to start tracking daily gains.
          </p>
        )}
      </div>

      {/* Daily Views Breakdown Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Daily Views Breakdown</h2>
        {data.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No daily view data yet. Run backfill and sync to see daily gains.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="p-2 text-left text-gray-700 dark:text-gray-200">Date</th>
                  <th className="p-2 text-right text-gray-700 dark:text-gray-200">Total Views Gained</th>
                  <th className="p-2 text-right text-gray-700 dark:text-gray-200">Channels</th>
                  <th className="p-2 text-center text-gray-700 dark:text-gray-200"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((day) => (
                  <Fragment key={day.date}>
                    <tr
                      className="border-t dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                    >
                      <td className="p-2 font-medium text-gray-900 dark:text-white">{formatDate(day.date)}</td>
                      <td className="p-2 text-right font-bold text-red-600 dark:text-red-400">+{fmt(day.total_views)}</td>
                      <td className="p-2 text-right text-gray-600 dark:text-gray-300">{day.channels.length}</td>
                      <td className="p-2 text-center text-gray-400">
                        {expandedDate === day.date ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expandedDate === day.date && day.channels.map((ch, idx) => (
                      <tr key={`${day.date}-${ch.channel_id}`} className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                        <td className="p-2 pl-8 text-gray-700 dark:text-gray-300">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">#{idx + 1}</span>
                            {ch.channel_name}
                          </span>
                        </td>
                        <td className="p-2 text-right text-gray-600 dark:text-gray-300">
                          +{fmt(ch.views)}
                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                            {day.total_views > 0 ? ((ch.views / day.total_views) * 100).toFixed(1) + '%' : '0%'}
                          </span>
                        </td>
                        <td className="p-2"></td>
                        <td className="p-2"></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
