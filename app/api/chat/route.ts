import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/agent/runner'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }
    const result = await runAgent(messages)
    return NextResponse.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
      needsConfirm: result.needsConfirm,
    })
  } catch (e: unknown) {
    console.error('[chat]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
