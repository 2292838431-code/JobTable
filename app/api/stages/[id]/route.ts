import { NextRequest, NextResponse } from 'next/server'
import { updateStage, deleteStage, deleteStageCascade, getStage } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const s = getStage(params.id)
  if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(s)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const s = updateStage(params.id, body)
  if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(s)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const cascade = req.nextUrl.searchParams.get('cascade') === 'true'
  if (cascade) {
    const result = deleteStageCascade(params.id)
    return NextResponse.json({ ok: true, ...result })
  }
  deleteStage(params.id)
  return NextResponse.json({ ok: true })
}
