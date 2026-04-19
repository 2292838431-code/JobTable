import { NextRequest, NextResponse } from 'next/server'
import { createApplication, listApplications } from '@/lib/db'
import { seedIfEmpty } from '@/lib/seed'

export const runtime = 'nodejs'

let seeded = false

export async function GET() {
  if (!seeded) {
    seeded = true
    try { seedIfEmpty() } catch (e) { console.error('[seed] error', e) }
  }
  return NextResponse.json(listApplications())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body?.company) return NextResponse.json({ error: 'company required' }, { status: 400 })
  const app = createApplication(body)
  return NextResponse.json(app)
}
