import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { aiGateway, AIMessage, AIProvider } from '@/lib/ai-gateway'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300 // Vercel only — nginx handled via X-Accel-Buffering: no

const encoder = new TextEncoder()

function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function isInsufficientBalanceError(error: unknown): boolean {
  const message = getErrorMessage(error, '').toLowerCase()
  return message.includes('402') && message.includes('insufficient balance')
}

export async function POST(req: NextRequest) {
  // ── 1. Auth & setup (sync, returns JSON error on failure) ────────────────
  let userId: string | undefined
  let user: { credits: number | null; email: string } | null = null
  let messages: AIMessage[]
  let actualProvider: AIProvider = 'qwen'
  let actualModel = 'qwen3-coder-plus'
  let maxTokens = 8000
  let balanceBefore = 0

  try {
    const session = await auth()
    userId = session?.user?.id

    if (!userId) {
      let demoUser = await prisma.user.findUnique({ where: { email: 'demo@aibuilder.local' } })
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: { email: 'demo@aibuilder.local', name: 'Demo User', credits: 10000 },
        })
      }
      userId = demoUser.id
    }

    const body = await req.json()
    messages = body.messages as AIMessage[]
    const { provider, model } = body
    maxTokens = body.maxTokens || 8000

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    if (provider && provider !== 'auto' && ['deepseek', 'openai', 'anthropic', 'qwen', 'openrouter'].includes(provider)) {
      actualProvider = provider as AIProvider
      actualModel = model || 'qwen2.5-coder-32b-instruct'
    }

    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, email: true },
    })

    // Stale session / DB reset — fall back to demo user
    if (!user) {
      let demoUser = await prisma.user.findUnique({ where: { email: 'demo@aibuilder.local' } })
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: { email: 'demo@aibuilder.local', name: 'Demo User', credits: 10000 },
        })
      }
      userId = demoUser.id
      user = { credits: demoUser.credits, email: demoUser.email }
    }

    // Top up demo users or empty accounts
    if (user.email === 'demo@aibuilder.local' || user.credits === null || user.credits < 1) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { credits: Math.max(10000, user.credits || 0) },
        select: { credits: true, email: true },
      })
      user = updated
    }

    balanceBefore = user.credits || 0
  } catch (setupErr: unknown) {
    console.error('AI chat setup error:', setupErr)
    return NextResponse.json({ error: getErrorMessage(setupErr, 'Setup failed') }, { status: 500 })
  }

  // ── 2. SSE streaming response ─────────────────────────────────────────────
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const send = async (data: object) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    } catch { /* client disconnected */ }
  }

  // Run async in background — response returns immediately so nginx/PM2 doesn't timeout
  ;(async () => {
    try {
      let providerInUse = actualProvider
      let modelInUse = actualModel
      let streamStarted = false

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          for await (const chunk of aiGateway.chatStream(messages, {
            provider: providerInUse,
            model: modelInUse,
            maxTokens,
          })) {
            if (chunk.delta) {
              streamStarted = true
              await send({ delta: chunk.delta })
            }
            if (chunk.done && chunk.usage) {
              const updatedUser = await prisma.user.update({
                where: { id: userId! },
                data: { credits: { decrement: chunk.usage.credits } },
                select: { credits: true },
              })
              await prisma.transaction.create({
                data: {
                  userId: userId!,
                  type: 'DEDUCTION',
                  amount: chunk.usage.credits,
                  balanceBefore,
                  balanceAfter: updatedUser.credits || 0,
                  metadata: `AI request: ${providerInUse} - ${modelInUse}`,
                },
              })
              await send({
                done: true,
                remainingCredits: updatedUser.credits,
                inputTokens: chunk.usage.inputTokens,
                outputTokens: chunk.usage.outputTokens,
                cost: chunk.usage.cost,
                creditsUsed: chunk.usage.credits,
              })
              return
            }
          }
          return
        } catch (attemptErr: unknown) {
          const canFallback =
            attempt === 0 &&
            providerInUse === 'deepseek' &&
            !streamStarted &&
            isInsufficientBalanceError(attemptErr)

          if (canFallback) {
            providerInUse = 'openrouter'
            modelInUse = 'qwen/qwen-2.5-coder-32b-instruct'
            continue
          }

          throw attemptErr
        }
      }
    } catch (err: unknown) {
      console.error('AI stream error:', err)
      await send({ error: getErrorMessage(err, 'AI request failed') })
    } finally {
      try { await writer.close() } catch { /* already closed */ }
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // CRITICAL: tells nginx not to buffer — prevents 502
    },
  })
}
