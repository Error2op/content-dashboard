'use client';

import { useEffect, useState } from 'react';

interface Channel {
  channel_id: string;
  name: string;
  subscriber_count: number;
}

export default function ChannelSelector({ selected, onSelect }: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.json())
      .then(setChannels);
  }, []);

  return (
    <select
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
      className="border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white"
    >
      <option value="">All Channels</option>
      {channels.map((ch) => (
        <option key={ch.channel_id} value={ch.channel_id}>
          {ch.name}
        </option>
      ))}
    </select>
  );
}
