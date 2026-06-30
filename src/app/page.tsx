'use client';

import { useState } from 'react';
import KPICards from '@/components/KPICards';
import Leaderboard from '@/components/Leaderboard';
import VideoGrid from '@/components/VideoGrid';
import ChannelSelector from '@/components/ChannelSelector';
import SyncButton from '@/components/SyncButton';
import ThemeToggle from '@/components/ThemeToggle';
import DailyViewLeaderboard from '@/components/DailyViewLeaderboard';

const TIME_RANGES = [
  { label: 'Today', value: 1 },
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

export default function Dashboard() {
  const [channelId, setChannelId] = useState('');
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState('views');

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">YouTube Shorts Dashboard</h1>
          <div className="flex items-center gap-3">
            <SyncButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <ChannelSelector selected={channelId} onSelect={setChannelId} />

          <div className="flex gap-2">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setDays(tr.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  days === tr.value
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards channelId={channelId} days={days} />

        {/* Daily Views Leaderboard (with chart + per-channel breakdown) */}
        <DailyViewLeaderboard days={days} />

        {/* Channel Leaderboard */}
        <Leaderboard days={days} />

        {/* Top Shorts Grid */}
        <VideoGrid
          channelId={channelId}
          days={days}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </main>

      <footer className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
        YouTube Shorts Analytics Dashboard &mdash; 38 Channel Tracker
      </footer>
    </div>
  );
}
