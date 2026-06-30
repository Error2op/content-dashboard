export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const db = getDb();

    // Get all snapshot dates in range, ordered ascending
    const datesResult = await db.execute({
      sql: `SELECT DISTINCT snapshot_date FROM daily_view_snapshots
            ORDER BY snapshot_date ASC`,
      args: [],
    });

    const allDates = datesResult.rows.map((r: any) => r.snapshot_date);
    if (allDates.length === 0) {
      return NextResponse.json([]);
    }

    // For each date, compute daily_view_gain = views_that_day - views_previous_day (per video per channel)
    // Day 1 gain = views_day1 (first snapshot), subsequent gain = views_dayN - views_dayN-1
    // We cut to the last N days

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Get all snapshots in range
    const snapshotsResult = await db.execute({
      sql: `SELECT video_id, channel_id, channel_name, snapshot_date, views
            FROM daily_view_snapshots
            WHERE snapshot_date >= ?
            ORDER BY video_id, snapshot_date ASC`,
      args: [cutoffStr],
    });

    // Build per-video timeline of views
    const videoTimeline: Record<string, { channelId: string; channelName: string; dates: Record<string, number> }> = {};

    for (const row of snapshotsResult.rows as any[]) {
      const vid = row.video_id;
      if (!videoTimeline[vid]) {
        videoTimeline[vid] = { channelId: row.channel_id, channelName: row.channel_name, dates: {} };
      }
      videoTimeline[vid].dates[row.snapshot_date] = Number(row.views) || 0;
    }

    // Also get today's current views from content_analytics (in case sync already ran today)
    const currentResult = await db.execute({
      sql: `SELECT video_id, channel_id, channel_name, views FROM content_analytics`,
      args: [],
    });

    const todayStr = new Date().toISOString().split('T')[0];
    for (const row of currentResult.rows as any[]) {
      const vid = row.video_id;
      if (!videoTimeline[vid]) {
        videoTimeline[vid] = { channelId: row.channel_id, channelName: row.channel_name, dates: {} };
      }
      // Only add today if not already captured by snapshot
      if (!videoTimeline[vid].dates[todayStr]) {
        videoTimeline[vid].dates[todayStr] = Number(row.views) || 0;
      }
    }

    // Compute daily gains per date per channel
    const sortedDates = Object.keys(
      [...Object.values(videoTimeline).flatMap(v => Object.keys(v.dates)), todayStr].reduce((a, d) => { a[d] = true; return a; }, {} as Record<string, boolean>)
    ).sort();

    // dayMap: date -> { channels: { channelId -> { name, views_gained } }, total_views }
    const dayMap: Record<string, { date: string; channels: Record<string, { channel_name: string; views: number }>; total_views: number }> = {};

    for (const [videoId, timeline] of Object.entries(videoTimeline)) {
      const dates = sortedDates.filter(d => timeline.dates[d] !== undefined);
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const currentViews = timeline.dates[date];
        const prevViews = i > 0 ? timeline.dates[dates[i - 1]] : 0;
        const gain = Math.max(0, currentViews - prevViews);

        if (gain === 0 && i > 0) continue; // skip zero gains (but first day counts even if 0)

        if (date < cutoffStr) continue;

        if (!dayMap[date]) {
          dayMap[date] = { date, channels: {}, total_views: 0 };
        }

        const chId = timeline.channelId;
        if (!dayMap[date].channels[chId]) {
          dayMap[date].channels[chId] = { channel_name: timeline.channelName, views: 0 };
        }
        dayMap[date].channels[chId].views += gain;
        dayMap[date].total_views += gain;
      }
    }

    // Convert to array & sort by date desc
    const dailyData = Object.values(dayMap)
      .map(day => ({
        date: day.date,
        total_views: day.total_views,
        channels: Object.entries(day.channels)
          .map(([channel_id, ch]) => ({ channel_id, channel_name: ch.channel_name, views: ch.views }))
          .sort((a, b) => b.views - a.views),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json(dailyData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
