import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/projects/[id]/preview
 *
 * Returns the raw index.html for the project iframe preview.
 * This endpoint sets its OWN permissive CSP so AI-generated pages can load
 * any CDN script (jQuery, Bootstrap, etc.) without being blocked by the
 * parent dashboard page's restrictive CSP.
 *
 * The iframe uses src="/api/projects/{id}/preview?v={previewKey}" so that
 * changing previewKey forces a fresh fetch and re-render.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    let userId = session?.user?.id
    if (!userId) {
      const demoUser = await prisma.user.findUnique({
        where: { email: 'demo@aibuilder.local' }
      })
      if (!demoUser) return new Response('Not found', { status: 404 })
      userId = demoUser.id
    }

    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: { files: true }
    })

    if (!project) return new Response('Not found', { status: 404 })

    const files = JSON.parse(project.files) as Record<string, string>
    const html = files['index.html'] ||
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#666"><p>No content yet. Ask AI to build your site.</p></body></html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        // Permissive CSP for user-generated preview — allows any CDN script/style
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
          "img-src * data: blob:",
          "font-src * data: blob:",
          "media-src * data: blob:",
        ].join('; '),
        // Only allow same-origin frames to embed this (the dashboard)
        'X-Frame-Options': 'SAMEORIGIN',
      }
    })
  } catch {
    return new Response('Error loading preview', { status: 500 })
  }
}
