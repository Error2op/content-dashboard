export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  try {
    const db = getDb();
    const result = await db.execute({
      sql: `
        SELECT 
          c.channel_id,
          c.name as channel_name,
          c.subscriber_count,
          COALESCE(SUM(ca.views), 0) as total_views,
          COALESCE(SUM(ca.likes), 0) as total_likes,
          COALESCE(SUM(ca.comments), 0) as total_comments,
          COUNT(ca.video_id) as shorts_count,
          COALESCE(AVG(ca.engagement_rate), 0) as avg_engagement,
          COALESCE(AVG(ca.views), 0) as avg_views
        FROM channels c
        LEFT JOIN content_analytics ca ON c.channel_id = ca.channel_id AND ca.published_at >= ?
        GROUP BY c.channel_id
        ORDER BY total_views DESC
      `,
      args: [sinceStr],
    });
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
