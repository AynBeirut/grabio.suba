import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    // Get or create demo user if no session
    let userId = session?.user?.id
    if (!userId) {
      let demoUser = await prisma.user.findUnique({
        where: { email: 'demo@aibuilder.local' }
      })
      
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: {
            email: 'demo@aibuilder.local',
            name: 'Demo User',
            credits: 10000,
          }
        })
      }
      userId = demoUser.id
    }

    // Get user's current credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user has no credits, give them some
    if (user.credits === null || user.credits <= 0) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { credits: 10000 },
        select: { credits: true }
      })
      return NextResponse.json({ credits: updated.credits })
    }

    return NextResponse.json({ credits: user.credits })
  } catch (error: any) {
    console.error('Credits fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
