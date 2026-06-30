'use client';

import { useState } from 'react';

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleSync = async () => {
    setSyncing(true);
    setResult('');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      setResult(`Synced ${data.totalShorts} shorts, ${data.errors?.length || 0} errors`);
    } catch (err: any) {
      setResult('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
      {result && <span className="text-sm text-gray-600 dark:text-gray-400">{result}</span>}
    </div>
  );
}
