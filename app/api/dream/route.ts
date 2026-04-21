import { NextResponse } from 'next/server';
import { runDreamCycle } from '@/lib/dream';

export const runtime = 'nodejs';
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.DREAM_TRIGGER_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  if (req.headers.get('x-vercel-cron')) return true;

  return false;
}

async function runAndRespond() {
  const userId = process.env.DEFAULT_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'DEFAULT_USER_ID not set' }, { status: 500 });
  }
  const dreams = await runDreamCycle(userId);
  return NextResponse.json({
    count: dreams.length,
    dreamIds: dreams.map((d) => d._id.toString()),
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runAndRespond();
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runAndRespond();
}
