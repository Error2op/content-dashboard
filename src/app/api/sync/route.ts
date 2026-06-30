export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST() {
  try {
    const output = execSync('npx tsx scripts/sync.ts', {
      env: { ...process.env },
      timeout: 300000,
      encoding: 'utf-8',
    });
    return NextResponse.json({ message: 'Sync completed', output });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
