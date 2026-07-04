import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateProjectMd } from "@/lib/generate-project-md"

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

function extractCustomBriefNotes(md?: string): string | null {
  if (!md) return null
  const marker = '## Custom Notes'
  const idx = md.indexOf(marker)
  if (idx === -1) return null
  const notes = md.slice(idx + marker.length).trim()
  return notes || null
}

function normalizePageNames(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.map((entry) => String(entry ?? ''))
    : typeof value === 'string'
      ? value.split(',').map((entry) => String(entry ?? ''))
      : []

  const cleaned = raw
    .map((name, index) => (index === 0 ? 'Home' : name.trim()))
    .filter((name, index) => index === 0 || name.length > 0)

  const deduped: string[] = []
  const seen = new Set<string>()
  for (const name of cleaned) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(name)
  }

  if (deduped.length === 0) return ['Home']
  if (deduped[0] !== 'Home') deduped.unshift('Home')
  return deduped
}

function inferContentStructure(value: unknown, pageNames: string[]): 'single-page' | 'multi-page' {
  if (pageNames.length > 1) return 'multi-page'
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'multi-page' ? 'multi-page' : 'single-page'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
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
          }
        })
      }
      userId = demoUser.id
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const url = new URL(request.url)
    const parsedMeta = project.metadata ? JSON.parse(project.metadata) : {}
    if (parsedMeta.pageImages) delete parsedMeta.pageImages

    // ?lean=1 — return ONLY lightweight fields (no files, no HTML). Used for instant UI skeleton.
    if (url.searchParams.get('lean') === '1') {
      return NextResponse.json({
        id: project.id,
        name: project.name,
        description: project.description,
        framework: project.framework,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        // Just the meta fields needed to know if images/md exist
        pageImagePaths: parsedMeta.pageImagePaths || null,
        // Quick string check — avoids parsing full JSON
        hasImages: project.files.includes('"images/'),
        hasProjectMd: (() => {
          try { const f = JSON.parse(project.files); return !!f['project.md'] } catch { return false }
        })(),
      })
    }

    // Parse files — optionally exclude large base64 image entries
    const allFiles = JSON.parse(project.files) as Record<string, string>
    const excludeImages = url.searchParams.get('excludeImages') === '1'
    const files = excludeImages
      ? Object.fromEntries(Object.entries(allFiles).filter(([k]) => !k.startsWith('images/')))
      : allFiles

    const existingProjectMd = typeof allFiles['project.md'] === 'string' ? allFiles['project.md'] : undefined
    const preservedCustomNotes =
      extractCustomBriefNotes(existingProjectMd)
      || (typeof parsedMeta.customBriefNotes === 'string' ? parsedMeta.customBriefNotes : '')

    const metaForMd = {
      ...parsedMeta,
      ...(preservedCustomNotes && preservedCustomNotes.trim() ? { customBriefNotes: preservedCustomNotes.trim() } : {}),
    }

    files['project.md'] = generateProjectMd(project.name, metaForMd)

    // Parse files JSON string back to object and include enhanced options
    const projectWithFiles = {
      ...project,
      files,
      navType: parsedMeta.navType || parsedMeta.navigationStyle || 'top-nav',
      ...parsedMeta,
    }

    return NextResponse.json(projectWithFiles)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
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
          }
        })
      }
      userId = demoUser.id
    }

    const body = await request.json()
    const {
      name, description, files,
      // Company / settings info fields
      template, brandName, logo, images, mission, vision, aboutUs,
      phone, email, location, primaryColor,
      facebook, twitter, linkedin, instagram,
      numberOfPages, pageNames,
      // Chat history
      chatHistory,
      // Page images
      pageImages,
      // Wizard step data
      designStyle, contentSections, contentTone, specialFeatures,
      fontFamily,
      navigationStyle, heroLayout, contentStructure, footerStyle, mobileLayout,
      navType, pageCarousel, pageGallery, pageLayouts, pageSectionSizes, sectionPageMap,
      templateSections,
      brandColors, category,
      customBriefNotes,
      shareSlug, shareEnabled,
    } = body

    // Check ownership first
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })
    
    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    
    if (existingProject.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Merge new company/settings fields into existing metadata
    const existingMeta = existingProject.metadata ? JSON.parse(existingProject.metadata) : {}
    const metaFields = {
      template, brandName, logo, images, mission, vision, aboutUs,
      phone, email, location, primaryColor,
      facebook, twitter, linkedin, instagram,
      numberOfPages, pageNames,
      chatHistory,
      pageImages,
      designStyle, contentSections, contentTone, specialFeatures,
      fontFamily,
      navigationStyle, heroLayout, contentStructure, footerStyle, mobileLayout,
      navType, pageCarousel, pageGallery, pageLayouts, pageSectionSizes, sectionPageMap,
      templateSections,
      brandColors, category,
      customBriefNotes,
      shareSlug, shareEnabled,
    }
    // Only update defined keys so we don't overwrite with undefined
    const updatedMeta = { ...existingMeta }
    for (const [k, v] of Object.entries(metaFields)) {
      if (v !== undefined) updatedMeta[k] = v
    }

    const canonicalNavType = (updatedMeta.navType as string | undefined)
      || (updatedMeta.navigationStyle as string | undefined)
      || 'top-nav'
    updatedMeta.navType = canonicalNavType
    updatedMeta.navigationStyle = canonicalNavType

    const normalizedPageNames = normalizePageNames(updatedMeta.pageNames)
    updatedMeta.pageNames = normalizedPageNames.join(',')
    updatedMeta.numberOfPages = String(normalizedPageNames.length)
    updatedMeta.contentStructure = inferContentStructure(updatedMeta.contentStructure, normalizedPageNames)

    // Merge incoming files with existing files, then regenerate project.md
    const existingFiles: Record<string, string> = JSON.parse(existingProject.files || '{}')
    const mergedFiles: Record<string, string> = files ? { ...existingFiles, ...files } : { ...existingFiles }

    const incomingProjectMd = files && typeof files === 'object'
      ? (files as Record<string, string>)['project.md']
      : undefined
    const existingProjectMd = existingFiles['project.md']
    const preservedCustomNotes =
      extractCustomBriefNotes(incomingProjectMd)
      || extractCustomBriefNotes(existingProjectMd)
      || (typeof updatedMeta.customBriefNotes === 'string' ? updatedMeta.customBriefNotes : '')

    if (preservedCustomNotes && preservedCustomNotes.trim()) {
      updatedMeta.customBriefNotes = preservedCustomNotes.trim()
    }

    // Extract pageImages base64 → save as actual image files in project workspace
    if (updatedMeta.pageImages) {
      const rawPageImages = updatedMeta.pageImages as Record<string, Record<string, string>>
      const pageImagePaths: Record<string, Record<string, string>> = {
        ...((updatedMeta.pageImagePaths as Record<string, Record<string, string>>) || {}),
      }
      for (const [pageName, sections] of Object.entries(rawPageImages)) {
        for (const [section, dataUrl] of Object.entries(sections)) {
          if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
            const ext = dataUrl.includes('image/png') ? 'png' : 'jpg'
            const safePage = pageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            const imgPath = `images/${safePage}-${section}.${ext}`
            mergedFiles[imgPath] = dataUrl
            if (!pageImagePaths[pageName]) pageImagePaths[pageName] = {}
            pageImagePaths[pageName][section] = imgPath
          }
        }
      }
      updatedMeta.pageImagePaths = pageImagePaths
      delete updatedMeta.pageImages // don't store raw base64 in metadata
    }

    // Extract logo base64 → save as image file so the preview iframe can display it
    if (updatedMeta.logo && typeof updatedMeta.logo === 'string' && (updatedMeta.logo as string).startsWith('data:')) {
      const ext = (updatedMeta.logo as string).includes('image/png') ? 'png' : 'jpg'
      mergedFiles[`images/logo.${ext}`] = updatedMeta.logo as string
      updatedMeta.logo = `images/logo.${ext}`
    }

    // Always regenerate project.md so it stays in sync with latest settings
    const projectName = (name || existingProject.name) ?? 'My Project'
    mergedFiles['project.md'] = generateProjectMd(projectName, updatedMeta)

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        files: JSON.stringify(mergedFiles),
        metadata: JSON.stringify(updatedMeta),
        updatedAt: new Date(),
      },
    })

    // Parse files back to object for response and spread saved metadata
    const savedMeta = project.metadata ? JSON.parse(project.metadata) : {}
    // Never expose raw base64 in response
    if (savedMeta.pageImages) delete savedMeta.pageImages

    const projectWithFiles = {
      ...project,
      files: JSON.parse(project.files),
      ...savedMeta,
    }

    return NextResponse.json(projectWithFiles)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.project.delete({
      where: {
        id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
