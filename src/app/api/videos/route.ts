export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get('channelId') || '';
  const sortBy = searchParams.get('sortBy') || 'views';
  const days = parseInt(searchParams.get('days') || '30', 10);
  
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  try {
    const db = getDb();
    let query = `SELECT * FROM content_analytics WHERE published_at >= ?`;
    const args: any[] = [sinceStr];

    if (channelId) {
      query += ` AND channel_id = ?`;
      args.push(channelId);
    }

    const allowedSort = ['views', 'likes', 'comments', 'engagement_rate'];
    const orderBy = allowedSort.includes(sortBy) ? sortBy : 'views';
    query += ` ORDER BY ${orderBy} DESC LIMIT 50`;

    const result = await db.execute({ sql: query, args });
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
