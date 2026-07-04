import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateProjectMd } from "@/lib/generate-project-md"

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Template files for different project types
const TEMPLATES = {
  blank: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Awesome Website</title>
    <style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    background: linear-gradient(135deg, #ff6b35 0%, #4a90e2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
}

.header {
    text-align: center;
    color: white;
    margin-bottom: 60px;
    animation: fadeIn 1s ease-in;
}

.header h1 {
    font-size: 48px;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.tagline {
    font-size: 20px;
    opacity: 0.95;
}

.content {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    margin-bottom: 60px;
}

.card {
    background: white;
    padding: 40px 30px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: slideUp 0.6s ease-out;
}

.card:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.3);
}

.emoji {
    font-size: 64px;
    margin-bottom: 20px;
}

.card h2 {
    color: #333;
    font-size: 24px;
    margin-bottom: 10px;
}

.card p {
    color: #666;
    font-size: 16px;
}

.footer {
    text-align: center;
    color: white;
    font-size: 14px;
    opacity: 0.9;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Your Creative Space</h1>
            <p class="tagline">Where ideas come to life! ✨</p>
        </div>
        
        <div class="content">
            <div class="card">
                <div class="emoji">🚀</div>
                <h2>Ready to Build?</h2>
                <p>Start creating something amazing with AI assistance</p>
            </div>
            
            <div class="card">
                <div class="emoji">💡</div>
                <h2>Get Inspired</h2>
                <p>Tell the AI what you want to create and watch the magic happen</p>
            </div>
            
            <div class="card">
                <div class="emoji">🎉</div>
                <h2>Have Fun</h2>
                <p>Building websites should be enjoyable and exciting!</p>
            </div>
        </div>
        
        <div class="footer">
            <p>💻 Made with love using AI Builder</p>
        </div>
    </div>
</body>
</html>`,
    "style.css": `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    background: linear-gradient(135deg, #ff6b35 0%, #4a90e2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
}

.header {
    text-align: center;
    color: white;
    margin-bottom: 60px;
    animation: fadeIn 1s ease-in;
}

.header h1 {
    font-size: 48px;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.tagline {
    font-size: 20px;
    opacity: 0.95;
}

.content {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    margin-bottom: 60px;
}

.card {
    background: white;
    padding: 40px 30px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: slideUp 0.6s ease-out;
}

.card:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.3);
}

.emoji {
    font-size: 64px;
    margin-bottom: 20px;
}

.card h2 {
    color: #333;
    font-size: 24px;
    margin-bottom: 10px;
}

.card p {
    color: #666;
    font-size: 16px;
}

.footer {
    text-align: center;
    color: white;
    font-size: 14px;
    opacity: 0.9;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}`,
    "script.js": `// Your JavaScript code here
console.log('Welcome to your new project!');`,
  },
  landing: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page</title>
    <style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 40px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.logo {
    font-size: 24px;
    font-weight: bold;
    color: #4f46e5;
}

.hero {
    text-align: center;
    padding: 100px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.hero h1 {
    font-size: 48px;
    margin-bottom: 20px;
}

.hero p {
    font-size: 20px;
    margin-bottom: 30px;
    opacity: 0.9;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 40px;
    padding: 80px 40px;
    max-width: 1200px;
    margin: 0 auto;
}

.feature {
    text-align: center;
    padding: 30px;
}

.feature h3 {
    font-size: 32px;
    margin-bottom: 10px;
}

.cta-button {
    padding: 12px 30px;
    border: 2px solid #4f46e5;
    background: white;
    color: #4f46e5;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.cta-button:hover {
    background: #4f46e5;
    color: white;
}

.cta-button.primary {
    background: #4f46e5;
    color: white;
}

.cta-button.primary:hover {
    background: #4338ca;
}
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="logo">YourBrand</div>
            <button class="cta-button">Get Started</button>
        </nav>
    </header>
    
    <section class="hero">
        <h1>Build Something Amazing</h1>
        <p>Your journey starts here with powerful tools and AI assistance</p>
        <button class="cta-button primary">Start Building</button>
    </section>
    
    <section class="features">
        <div class="feature">
            <h3>🚀 Fast</h3>
            <p>Lightning-fast performance</p>
        </div>
        <div class="feature">
            <h3>💡 Smart</h3>
            <p>AI-powered assistance</p>
        </div>
        <div class="feature">
            <h3>🎨 Beautiful</h3>
            <p>Modern design</p>
        </div>
    </section>
</body>
</html>`,
    "style.css": `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 40px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.logo {
    font-size: 24px;
    font-weight: bold;
    color: #4f46e5;
}

.hero {
    text-align: center;
    padding: 100px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.hero h1 {
    font-size: 48px;
    margin-bottom: 20px;
}

.hero p {
    font-size: 20px;
    margin-bottom: 30px;
    opacity: 0.9;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 40px;
    padding: 80px 40px;
    max-width: 1200px;
    margin: 0 auto;
}

.feature {
    text-align: center;
    padding: 30px;
}

.feature h3 {
    font-size: 32px;
    margin-bottom: 10px;
}

.cta-button {
    padding: 12px 30px;
    border: 2px solid #4f46e5;
    background: white;
    color: #4f46e5;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.cta-button:hover {
    background: #4f46e5;
    color: white;
}

.cta-button.primary {
    background: #4f46e5;
    color: white;
}

.cta-button.primary:hover {
    background: #4338ca;
}`,
    "script.js": `document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', () => {
        alert('Button clicked! Add your action here.');
    });
});`,
  },
  portfolio: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
    <style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    text-align: center;
    padding: 80px 20px;
    background: #f8f9fa;
}

header h1 {
    font-size: 48px;
    margin-bottom: 10px;
}

section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 60px 20px;
}

h2 {
    font-size: 32px;
    margin-bottom: 30px;
    text-align: center;
}

.about p {
    text-align: center;
    font-size: 18px;
    max-width: 600px;
    margin: 0 auto;
}

.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-top: 40px;
}

.project-card {
    padding: 30px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    transition: transform 0.3s, box-shadow 0.3s;
}

.project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.project-card h3 {
    margin-bottom: 10px;
    color: #4f46e5;
}

footer {
    text-align: center;
    padding: 40px 20px;
    background: #f8f9fa;
    margin-top: 60px;
}
    </style>
</head>
<body>
    <header>
        <h1>John Doe</h1>
        <p>Web Developer & Designer</p>
    </header>
    
    <section class="about">
        <h2>About Me</h2>
        <p>I create beautiful, functional websites that help businesses grow.</p>
    </section>
    
    <section class="projects">
        <h2>My Projects</h2>
        <div class="project-grid">
            <div class="project-card">
                <h3>Project 1</h3>
                <p>E-commerce website built with modern technologies</p>
            </div>
            <div class="project-card">
                <h3>Project 2</h3>
                <p>Mobile app design and development</p>
            </div>
            <div class="project-card">
                <h3>Project 3</h3>
                <p>Brand identity and marketing materials</p>
            </div>
        </div>
    </section>
    
    <footer>
        <p>Get in touch: hello@example.com</p>
    </footer>
</body>
</html>`,
    "style.css": `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    text-align: center;
    padding: 80px 20px;
    background: #f8f9fa;
}

header h1 {
    font-size: 48px;
    margin-bottom: 10px;
}

section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 60px 20px;
}

h2 {
    font-size: 32px;
    margin-bottom: 30px;
    text-align: center;
}

.about p {
    text-align: center;
    font-size: 18px;
    max-width: 600px;
    margin: 0 auto;
}

.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-top: 40px;
}

.project-card {
    padding: 30px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    transition: transform 0.3s, box-shadow 0.3s;
}

.project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.project-card h3 {
    margin-bottom: 10px;
    color: #4f46e5;
}

footer {
    text-align: center;
    padding: 40px 20px;
    background: #f8f9fa;
    margin-top: 60px;
}`,
    "script.js": `// Add smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});`,
  },
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

export async function POST(request: Request) {
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
          }
        })
      }
      userId = demoUser.id
    }

        const body = await request.json()
        const {
            name,
            description,
            template = "blank",
            designStyle,
            contentSections,
            contentTone,
            specialFeatures,
            fontFamily,
            navigationStyle,
            heroLayout,
            contentStructure,
            footerStyle,
            mobileLayout,
            category,
            brandName,
            primaryColor,
            logo,
            images,
            phone,
            email,
            location,
            facebook,
            twitter,
            linkedin,
            instagram,
            mission,
            vision,
            aboutUs,
            numberOfPages,
            pageNames,
            pageImages,
            servicesDescription,
            servicesList,
            navType,
            pageLayouts,
            sectionPageMap,
            pageSectionSizes,
            pageCarousel,
            pageGallery,
            templateSections,
            extras,
            carouselCount,
            galleryCount,
            brandColors,
            customBriefNotes,
        } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Get template files
    const templateFiles = TEMPLATES[template as keyof typeof TEMPLATES] || TEMPLATES.blank

    // Prepare enhanced project data
        const canonicalNavType = navType || navigationStyle || 'top-nav'
    const normalizedPageNames = normalizePageNames(pageNames)
    const normalizedPageNamesCsv = normalizedPageNames.join(',')
    const canonicalContentStructure = inferContentStructure(contentStructure, normalizedPageNames)
        const enhancedData = {
            template,
            designStyle,
            contentSections,
            contentTone,
            specialFeatures,
            fontFamily,
            navigationStyle: canonicalNavType,
            heroLayout,
            contentStructure: canonicalContentStructure,
            footerStyle,
            mobileLayout,
            category,
            brandName,
            primaryColor,
            logo,
            images,
            phone,
            email,
            location,
            facebook,
            twitter,
            linkedin,
            instagram,
            mission,
            vision,
            aboutUs,
            numberOfPages: String(normalizedPageNames.length),
            pageNames: normalizedPageNamesCsv,
            pageImages,
            servicesDescription,
            servicesList,
            navType: canonicalNavType,
            pageLayouts,
            sectionPageMap,
            pageSectionSizes,
            pageCarousel,
            pageGallery,
            templateSections,
            extras,
            carouselCount,
            galleryCount,
            brandColors,
            customBriefNotes,
        }

    // Auto-generate project.md brain from metadata
    const projectMd = generateProjectMd(name, enhancedData as Record<string, unknown>)
    const filesWithMd: Record<string, string> = { ...templateFiles, 'project.md': projectMd }

    // Extract pageImages base64 → save as actual image files in project workspace
    if (enhancedData.pageImages) {
      const rawPageImages = enhancedData.pageImages as Record<string, Record<string, string>>
      const pageImagePaths: Record<string, Record<string, string>> = {}
      for (const [pageName, sections] of Object.entries(rawPageImages)) {
        for (const [section, dataUrl] of Object.entries(sections)) {
          if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
            const ext = dataUrl.includes('image/png') ? 'png' : 'jpg'
            const safePage = pageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            const imgPath = `images/${safePage}-${section}.${ext}`
            filesWithMd[imgPath] = dataUrl
            if (!pageImagePaths[pageName]) pageImagePaths[pageName] = {}
            pageImagePaths[pageName][section] = imgPath
          }
        }
      }
      ;(enhancedData as Record<string, unknown>).pageImagePaths = pageImagePaths
      delete (enhancedData as Record<string, unknown>).pageImages // don't store raw base64 in metadata
    }

    // Extract logo base64 → save as image file so the preview iframe can display it
    if ((enhancedData as any).logo && typeof (enhancedData as any).logo === 'string' && ((enhancedData as any).logo as string).startsWith('data:')) {
      const logoData = (enhancedData as any).logo as string
      const ext = logoData.includes('image/png') ? 'png' : 'jpg'
      filesWithMd[`images/logo.${ext}`] = logoData
      ;(enhancedData as Record<string, unknown>).logo = `images/logo.${ext}`
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        userId,
        name,
        description: description || null,
        files: JSON.stringify(filesWithMd),
        framework: "html",
        // Store enhanced options in metadata field
        metadata: JSON.stringify(enhancedData),
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only select lightweight fields for the listing — skip files (HTML) and metadata (base64 images, chat history)
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        framework: true,
        createdAt: true,
        updatedAt: true,
        deployments: {
          select: {
            id: true,
            subdomain: true,
            deploymentUrl: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}
