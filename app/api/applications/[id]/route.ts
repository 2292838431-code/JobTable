import { NextRequest, NextResponse } from 'next/server'
import { getApplication, updateApplication, deleteApplication } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const app = getApplication(params.id)
  if (!app) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(app)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const app = updateApplication(params.id, body)
  if (!app) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(app)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  deleteApplication(params.id)
  return NextResponse.json({ ok: true })
}
