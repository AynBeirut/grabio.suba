"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import dynamic from "next/dynamic"
import { AIChat } from "@/components/ai/ai-chat"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Sparkles, Eye, Code, Settings, Share2, Undo, Redo, Cloud, Server, RefreshCw, ExternalLink, Monitor, Tablet, Smartphone, Github, ChevronLeft, ChevronRight, Coins, Check, Wrench, AlertTriangle, X } from "lucide-react"

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-slate-400 text-sm gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading editor...
    </div>
  )
})
interface Project {
  id: string
  name: string
  description: string | null
  files: Record<string, string>
  framework: string
  pageNames?: string
}

function toShareSlug(value: string): string {
  return (value || 'project')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'project'
}

export default function ProjectEditorPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionData = useSession()
  const session = sessionData?.data
  const projectId = params.id as string
  const requestedMode = searchParams.get('mode')
  const initialAiMode = requestedMode === 'planner' ? 'planner' : 'agent'

  // Add custom CSS for animations
  useEffect(() => {
    const styleTag = document.createElement('style')
    styleTag.textContent = `
      @keyframes reverse-spin {
        from { transform: rotate(360deg); }
        to { transform: rotate(0deg); }
      }
      .animate-reverse {
        animation: reverse-spin 1s linear infinite;
      }
    `
    document.head.appendChild(styleTag)
    return () => {
      document.head.removeChild(styleTag)
    }
  }, [])

  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filesLoading, setFilesLoading] = useState(true)
  const [undoHtml, setUndoHtml] = useState<string | null>(null)
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)
  const [settingsUpdated, setSettingsUpdated] = useState(false)
  const [isNewProject, setIsNewProject] = useState(false)
  const [newProjectPrompt, setNewProjectPrompt] = useState<string>("")
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isChatVisible, setIsChatVisible] = useState(true)
  const [showHostingModal, setShowHostingModal] = useState<'cloud' | 'server' | null>(null)
  const [showServerDnsSetup, setShowServerDnsSetup] = useState(false)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat')
  const [previewKey, setPreviewKey] = useState(0)
  const [showCode, setShowCode] = useState(false)
  const [codeTab, setCodeTab] = useState<'index.html' | 'project.md'>('index.html')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedElementContext, setSelectedElementContext] = useState<string | null>(null)
  const [showShareToast, setShowShareToast] = useState(false)
  const [pageImages, setPageImages] = useState<Record<string, Record<string, string>>>({})
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  // Preview error debug state
  const [previewErrors, setPreviewErrors] = useState<string[]>([])
  const [showErrorPanel, setShowErrorPanel] = useState(false)
  const [fixPrompt, setFixPrompt] = useState<string | null>(null)
  const [autoFixAttempts, setAutoFixAttempts] = useState(0)
  const [autoFixActive, setAutoFixActive] = useState(false)
  const [confidenceIssues, setConfidenceIssues] = useState<string[]>([])
  const MAX_AUTO_FIX_ATTEMPTS = 4
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const autoFixStabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildFixPromptFromErrors = useCallback((errors: string[]) => {
    const errorList = errors.join('\n')
    const currentHtml = files['index.html'] || ''
    return `The preview has these JavaScript/runtime errors:\n${errorList}\n\nPlease fix all errors in the website code and keep ALL existing sections/pages/features intact. Here is the current HTML:\n\`\`\`html\n${currentHtml.slice(0, 12000)}\n\`\`\`\n\nRequirements:\n1) Fix every error.\n2) Keep navigation working across all page sections.\n3) Output the complete corrected website in one HTML block.`
  }, [files])

  const sendSelectModeToPreview = useCallback((enabled: boolean) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: '__toggle_select_mode__', enabled }, '*')
    } catch {}
  }, [])

  // Listen for errors reported from the preview iframe via postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === '__preview_select__' && e.data.detail) {
        const detail = e.data.detail as {
          tag?: string
          id?: string
          classes?: string
          text?: string
          path?: string
        }
        const tag = (detail.tag || '').toLowerCase()
        const id = detail.id ? `#${detail.id}` : ''
        const classes = detail.classes ? `.${detail.classes.split(/\s+/).filter(Boolean).slice(0, 3).join('.')}` : ''
        const text = (detail.text || '').trim().replace(/\s+/g, ' ').slice(0, 90)
        const path = (detail.path || '').trim().slice(0, 180)
        const label = [tag || 'element', `${id}${classes}`.trim(), text ? `"${text}"` : '', path ? `path:${path}` : '']
          .filter(Boolean)
          .join(' • ')
        setSelectedElementContext(label)
        setSelectMode(false)
        return
      }

      if (e.data?.type === '__preview_nav_debug__' && e.data.event) {
        const detail = typeof e.data.detail === 'string' ? e.data.detail : JSON.stringify(e.data.detail || {})
        const msg = `[NAVDBG] ${String(e.data.event)} ${detail}`.trim()
        setPreviewErrors(prev => {
          const next = [...prev, msg].slice(-14)
          if (next.length > 0) setShowErrorPanel(true)
          return next
        })
        return
      }

      if (e.data?.type === '__preview_error__' && e.data.error) {
        const err = String(e.data.error)
        // Ignore CORS/sandbox/network errors — these are artifacts of the sandboxed srcDoc iframe
        // (origin:null blocks fonts, auth fetches, service workers — none are real app bugs)
        if (/cors|blocked by|allow-same-origin|serviceworker|_next\/static|ERR_FAILED|net::|woff2|auth\/session|Failed to fetch|null.*origin|origin.*null/i.test(err)) return
        setPreviewErrors(prev => {
          const next = [...prev, err].slice(-10) // keep last 10
          if (next.length > 0) setShowErrorPanel(true)
          return next
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => sendSelectModeToPreview(selectMode), 120)
    return () => clearTimeout(timer)
  }, [selectMode, previewKey, sendSelectModeToPreview])

  // Close settings dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRefreshPreview = () => {
    setPreviewErrors([])
    setConfidenceIssues([])
    setShowErrorPanel(false)
    setAutoFixAttempts(0)
    setAutoFixActive(false)
    setPreviewKey(k => k + 1)
  }

  const validateConfidenceGates = useCallback(async (): Promise<{ ok: boolean; issues: string[] }> => {
    const issues: string[] = []
    const html = files['index.html'] || ''

    if (!html.trim()) {
      return { ok: false, issues: ['No website HTML found to validate.'] }
    }

    if (previewErrors.length > 0) issues.push(`Preview reports ${previewErrors.length} runtime error(s).`)
    if (autoFixActive || !!fixPrompt || isAiGenerating || isApplyingUpdate) {
      issues.push('A build/fix operation is still running.')
    }

    const pageSectionIds = Array.from(html.matchAll(/id=["']page-([^"']+)["']/gi)).map((match) => match[1])
    const htmlLinkRefs = Array.from(html.matchAll(/href=["']([^"']+\.html(?:#[^"']*)?)["']/gi)).map((match) => match[1])
    if (htmlLinkRefs.length > 0) {
      issues.push('Navigation still contains .html links instead of in-page section switching.')
    }

    if (pageSectionIds.length > 1) {
      const hasNavigationSwitcher = /function\s+(showPage|navigateTo|switchPage)\s*\(/i.test(html)
      if (!hasNavigationSwitcher) issues.push('Multi-page structure found but no showPage/navigateTo/switchPage function detected.')

      const navDataPageCount = (html.match(/data-page=["'][^"']+["']/gi) || []).length
      if (navDataPageCount === 0) issues.push('No data-page navigation links found for multi-page structure.')
    }

    return { ok: issues.length === 0, issues }
  }, [files, previewErrors, autoFixActive, fixPrompt, isAiGenerating, isApplyingUpdate])

  const handleRollbackLatest = useCallback(async () => {
    if (!undoHtml) return
    const revertedFiles = { ...files, 'index.html': undoHtml }
    setFiles(revertedFiles)
    setPreviewErrors([])
    setConfidenceIssues([])
    setShowErrorPanel(false)
    setPreviewKey(k => k + 1)
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: revertedFiles }),
      })
    } catch {}
  }, [undoHtml, files, projectId])

  useEffect(() => {
    if (previewErrors.length === 0) return
    if (isAiGenerating || isApplyingUpdate || !!fixPrompt) return
    if (autoFixAttempts >= MAX_AUTO_FIX_ATTEMPTS) {
      setShowErrorPanel(true)
      setAutoFixActive(false)
      return
    }

    const uniqueErrors = Array.from(new Set(previewErrors)).slice(-6)
    setAutoFixActive(true)
    setAutoFixAttempts(prev => prev + 1)
    setFixPrompt(buildFixPromptFromErrors(uniqueErrors))
    setShowErrorPanel(false)
    setPreviewErrors([])
  }, [
    previewErrors,
    isAiGenerating,
    isApplyingUpdate,
    fixPrompt,
    autoFixAttempts,
    buildFixPromptFromErrors,
  ])

  useEffect(() => {
    if (autoFixStabilityTimer.current) {
      clearTimeout(autoFixStabilityTimer.current)
      autoFixStabilityTimer.current = null
    }

    const waitingForStablePreview = autoFixActive && !isAiGenerating && !isApplyingUpdate && !fixPrompt
    if (!waitingForStablePreview || previewErrors.length > 0) return

    autoFixStabilityTimer.current = setTimeout(() => {
      setAutoFixActive(false)
      setAutoFixAttempts(0)
    }, 1500)

    return () => {
      if (autoFixStabilityTimer.current) {
        clearTimeout(autoFixStabilityTimer.current)
        autoFixStabilityTimer.current = null
      }
    }
  }, [autoFixActive, isAiGenerating, isApplyingUpdate, fixPrompt, previewErrors.length, previewKey])

  useEffect(() => {
    return () => {
      if (autoFixStabilityTimer.current) clearTimeout(autoFixStabilityTimer.current)
    }
  }, [])

  const handleViewInBrowser = () => {
    const html = previewHtml
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const handleCopyShareLink = async () => {
    const slug = toShareSlug(project?.name || projectId)

    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareSlug: slug, shareEnabled: true }),
      })
    } catch {
      // continue: copy link even if metadata save fails transiently
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ai.aynbeirut.dev'
    const url = `${origin}/builder/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 3000)
    })
  }

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      try {
        // ── Phase 1: lean meta-only fetch → show UI shell immediately ──────
        const leanRes = await fetch(`/api/projects/${projectId}?lean=1`)
        if (!leanRes.ok) throw new Error("Failed to load project")
        const leanData = await leanRes.json()

        // Detect wizard update (set by edit page on save)
        const wizardKey = `wizard-updated-${projectId}`
        if (sessionStorage.getItem(wizardKey)) {
          sessionStorage.removeItem(wizardKey)
          setSettingsUpdated(true)
        }

        // Set minimal project info so the header/toolbar render right away
        setProject({ id: leanData.id, name: leanData.name, description: leanData.description, files: {}, framework: leanData.framework, pageNames: leanData.pageNames })
        setLoading(false)  // ← UI shell visible now

        // ── Phase 2: background file load (HTML + project.md) ───────────────
        const fullRes = await fetch(`/api/projects/${projectId}?excludeImages=1`)
        if (!fullRes.ok) { setFilesLoading(false); return }
        const fullData = await fullRes.json()

        // If project.md is missing, trigger a silent PATCH to auto-generate it
        if (!fullData.files?.['project.md']) {
          try {
            const mdRes = await fetch(`/api/projects/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
            if (mdRes.ok) {
              const mdData = await mdRes.json()
              if (mdData.files?.['project.md']) {
                fullData.files['project.md'] = mdData.files['project.md']
              }
            }
          } catch {}
        }

        setProject({ ...fullData, pageNames: fullData.pageNames })
        setFiles(fullData.files || {})
        if (fullData.pageImages) setPageImages(fullData.pageImages)
        setFilesLoading(false)

        // ── Phase 3: background image data load (only if images exist) ───────
        if (leanData.hasImages) {
          try {
            const imgRes = await fetch(`/api/projects/${projectId}`)
            if (imgRes.ok) {
              const imgData = await imgRes.json()
              const imageFiles = Object.fromEntries(
                Object.entries(imgData.files as Record<string, string>).filter(([k]) => k.startsWith('images/'))
              )
              if (Object.keys(imageFiles).length > 0) {
                setFiles(prev => ({ ...prev, ...imageFiles }))
              }
            }
          } catch {}
        }

        // Check if this is a new project needing initial AI generation
        const html = fullData.files?.['index.html'] || ''
        const isGenericTemplate = !html.includes(fullData.name) &&
          (html.includes('Your Creative Space') ||
           html.includes('Welcome to My Website') ||
           html.includes('YourBrand') ||
           html.includes('Build Something Amazing'))

        if (isGenericTemplate) {
          setIsNewProject(true)
          const pages = (fullData.pageNames || 'Home').split(',').map((p: string) => p.trim()).filter(Boolean)
          const extras = (fullData.extras || fullData.selectedExtras || []) as string[]
          const sections = (fullData.contentSections || fullData.selectedSections || []) as string[]
          const sectionPageMap = (fullData.sectionPageMap || {}) as Record<string, string[]>
          const pageLayouts = (fullData.pageLayouts || {}) as Record<string, string[]>
          const describeLayoutToken = (token: string) => {
            if (!token) return ''
            const prettify = (value: string) => value
              .replace(/^row:/, '')
              .split('|')
              .filter(Boolean)
              .map((part) => part.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()))

            if (token.startsWith('row:')) {
              return `[${prettify(token).join(' + ')}]`
            }

            return prettify(token)[0] || token
          }
          const pageContracts = pages.map((pg: string) => {
            const slug = pg.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'home'
            return `• ${pg} → data-page="${slug}" → id="page-${slug}"`
          }).join('\n')

          // Build per-page section descriptions
          const pageDetails = pages.map((pg: string) => {
            const layout = pageLayouts[pg]
            if (layout && layout.length > 0) {
              return `• ${pg}: rows in order — ${layout.map(describeLayoutToken).filter(Boolean).join(' → ')}`
            }
            // Fall back to sectionPageMap
            const pageSections = sections.filter(s => {
              const mapped = sectionPageMap[s] ?? ['all']
              return mapped.includes('all') || mapped.includes(pg)
            })
            return `• ${pg}: ${pageSections.length > 0 ? pageSections.join(', ') : 'hero, content, contact'}`
          }).join('\n')

          setNewProjectPrompt(`You are an expert web developer. Build a complete, multi-page website as a SINGLE HTML file. Do NOT use placeholders — fill everything with the real content provided below.

=== BRAND INFO ===
Business Name: ${fullData.name || fullData.brandName || 'My Business'}
Tagline / Description: ${fullData.description || fullData.mission || ''}
About Us: ${fullData.aboutUs || ''}
Services / Products: ${fullData.servicesList || fullData.services || ''}
Email: ${fullData.email || ''}
Phone: ${fullData.phone || ''}
Location: ${fullData.location || ''}
Facebook: ${fullData.facebook || ''}
Instagram: ${fullData.instagram || ''}
LinkedIn: ${fullData.linkedin || ''}

=== DESIGN ===
Template: ${fullData.template || 'general'}
Design Style: ${fullData.designStyle || 'modern'}
Primary Color: ${fullData.primaryColor || '#2563eb'}
Brand Colors: ${(fullData.brandColors || []).join(', ')}
Content Tone: ${fullData.contentTone || 'professional'}

=== NAVIGATION & EXTRAS ===
Navigation Type: ${fullData.navType || fullData.navigationStyle || 'top-nav'}
Hero Layout: ${fullData.heroLayout || 'centered'}
Footer Style: ${fullData.footerStyle || 'standard'}
Extra Components: ${extras.join(', ') || 'none'}

=== PAGES & THEIR SECTIONS ===
${pageDetails}

=== REQUIRED PAGE CONTRACT ===
- This project has ${pages.length} page(s): ${pages.join(', ')}
- You MUST build every page listed above.
- Do NOT collapse them into one long scrolling page.
${pageContracts}

=== AI BUILDER CREATIVE DIRECTION ===
- The wizard settings are mandatory constraints, not a reason to make the design stiff or literal.
- Understand the business first, then design a polished, modern website around it.
- Keep the user's exact pages, structure intent, colors, and selected options.
- Improve the result with premium spacing, better hierarchy, stronger typography, cleaner section composition, better CTA placement, and a more professional visual flow.
- Do NOT produce an ugly/basic template look just because the user input is short or informal.
- Rewrite rough raw text into polished website copy. Keep the meaning, but improve headlines, section copy, benefits, button labels, and calls to action.
- If information is thin, infer a stronger value proposition and cleaner content structure from the business type instead of leaving the page generic.

=== TECHNICAL REQUIREMENTS ===
1. Output ONE complete HTML file using Tailwind CSS via CDN.
2. For EACH required page contract above, create a matching <section id="page-slug" class="page-section"> block. Show only first page on load; others hidden.
3. Add a nav bar with links to ALL pages using `class="nav-link"` and the exact `data-page` values above. Use pure JS `showPage(id)` show/hide navigation.
4. For each page, include its sections in the ORDER listed above.
5. Use the primary color and design style throughout — apply real CSS classes, not placeholder colors.
6. Include ALL requested extra components (carousel uses real images from https://picsum.photos).
7. Fully responsive (mobile-first, Tailwind breakpoints).
8. Fill ALL text with realistic professional content from the brand info above — NO Lorem ipsum, NO TODO comments.

Output ONLY the complete HTML code, nothing else.`)
        }
      } catch (error) {
        console.error("Error loading project:", error)
        setFilesLoading(false)
        setLoading(false)
        alert("Failed to load project")
        router.push("/dashboard")
      }
    }

    loadProject()

    // Safety net: never leave loading states stuck forever
    const safetyTimer = setTimeout(() => {
      setFilesLoading(false)
      setLoading(false)
    }, 15000)
    return () => clearTimeout(safetyTimer)
  }, [projectId, router])

  // AI builds auto-apply to preview immediately — previous version saved for undo
  const handleCodeGenerated = useCallback(async (code: string, filename: string = "index.html") => {
    if (filename === "index.html") {
      // Save current HTML so user can undo
      setUndoHtml(files["index.html"] || null)
      // Show build animation, then apply
      setIsApplyingUpdate(true)
      await new Promise(r => setTimeout(r, 900))
      const updatedFiles = { ...files, 'index.html': code }
      setFiles(updatedFiles)
      setPreviewErrors([])
      setShowErrorPanel(false)
      // Save to DB in background
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: updatedFiles }),
        })
      } catch (error) {
        console.error("Error saving:", error)
      }
      setPreviewKey(k => k + 1)
      setIsApplyingUpdate(false)
    } else {
      // Non-HTML files (project.md etc.) update silently
      const updatedFiles = { ...files, [filename]: code }
      setFiles(updatedFiles)
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: updatedFiles }),
        })
      } catch {}
    }
  }, [files, projectId])

  // Memoized preview — recomputes when HTML, previewKey, or image data changes.
  const imageFilesKey = Object.keys(files).filter(k => k.startsWith('images/')).join(',')
  const previewHtml = useMemo(() => {
    let html = files["index.html"] || ""
    if (!html) return ""

    // Normalize hidden/control Unicode that can break JS parsing in srcdoc
    // (seen as: "Invalid or unexpected token" at about:srcdoc)
    html = html
      .replace(/[\u2028\u2029]/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\uFEFF/g, '')

    // Remove accidental markdown fences if model output leaked them
    html = html.replace(/```(?:html|project\.md)?/gi, '')

    // Inline project-local images so srcDoc can render them (about:srcdoc has no
    // filesystem/base path for relative images/... URLs).
    const resolveImageData = (rawPath: string): string | undefined => {
      const cleaned = String(rawPath || '').split('?')[0].split('#')[0]
      const normalized = cleaned.replace(/^\.\//, '').replace(/^\//, '')
      const imageIndex = normalized.indexOf('images/')
      const canonical = imageIndex >= 0 ? normalized.slice(imageIndex) : normalized
      return files[canonical] || files[normalized] || files[cleaned]
    }

    const inlineProjectImages = (raw: string): string => {
      let next = raw
      next = next.replace(/\b(src|poster|data-src)=(['"])([^'"\n]*images\/[^'"\n]+)\2/gi, (_m, attr, q, imgPath) => {
        const dataUrl = resolveImageData(imgPath)
        return dataUrl ? `${attr}=${q}${dataUrl}${q}` : `${attr}=${q}${imgPath}${q}`
      })
      next = next.replace(/url\((['"]?)([^'")\n]*images\/[^'")\n]+)\1\)/gi, (_m, q, imgPath) => {
        const dataUrl = resolveImageData(imgPath)
        return dataUrl ? `url("${dataUrl}")` : `url(${q}${imgPath}${q})`
      })
      return next
    }
    html = inlineProjectImages(html)

    const selectBridgeScript = `<script>(function(){
      if (window.__aiBuilderSelectBridgeInstalled__) return;
      window.__aiBuilderSelectBridgeInstalled__ = true;
      var enabled = false;
      var last = null;
      function clearHighlight(){
        if (!last) return;
        try {
          last.style.outline = '';
          last.style.outlineOffset = '';
          last.style.cursor = '';
        } catch {}
        last = null;
      }
      function setHighlight(el){
        if (!enabled || !el || el === document.documentElement || el === document.body) return;
        if (last && last !== el) clearHighlight();
        last = el;
        try {
          el.style.outline = '2px solid #22c55e';
          el.style.outlineOffset = '2px';
          el.style.cursor = 'crosshair';
        } catch {}
      }
      function cssPath(el){
        var parts = [];
        var node = el;
        var depth = 0;
        while (node && node.nodeType === 1 && depth < 8) {
          var name = (node.tagName || '').toLowerCase();
          if (!name) break;
          if (node.id) {
            parts.unshift(name + '#' + node.id);
            break;
          }
          var idx = 1;
          var sib = node;
          while ((sib = sib.previousElementSibling)) {
            if ((sib.tagName || '').toLowerCase() === name) idx++;
          }
          parts.unshift(name + ':nth-of-type(' + idx + ')');
          node = node.parentElement;
          depth++;
        }
        return parts.join(' > ');
      }
      function safeText(el){
        var txt = String((el && (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || (el && el.textContent) || '')).trim();
        return txt.replace(/\s+/g, ' ').slice(0, 120);
      }
      function sendSelection(el){
        var payload = {
          tag: (el.tagName || '').toLowerCase(),
          id: el.id || '',
          classes: typeof el.className === 'string' ? el.className : '',
          text: safeText(el),
          path: cssPath(el)
        };
        try { window.parent.postMessage({ type: '__preview_select__', detail: payload }, '*'); } catch {}
      }
      document.addEventListener('mousemove', function(e){
        if (!enabled) return;
        var t = e.target && e.target.closest ? e.target.closest('*') : null;
        if (!t || t.tagName === 'SCRIPT' || t.tagName === 'STYLE') return;
        setHighlight(t);
      }, true);
      document.addEventListener('click', function(e){
        if (!enabled) return;
        var t = e.target && e.target.closest ? e.target.closest('*') : null;
        if (!t) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        sendSelection(t);
        enabled = false;
        clearHighlight();
      }, true);
      window.addEventListener('message', function(e){
        if (!e || !e.data || e.data.type !== '__toggle_select_mode__') return;
        enabled = !!e.data.enabled;
        if (!enabled) clearHighlight();
      });
    })();</script>`

    const injectSelectBridge = (raw: string): string => {
      if (/<\/body>/i.test(raw)) return raw.replace(/<\/body>/i, `${selectBridgeScript}</body>`)
      return `${raw}${selectBridgeScript}`
    }

    const simpleNavScript = `<script>(function(){function norm(s){return(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}function switchTo(stem){if(!stem)return;if(typeof window.showPage==='function'){window.showPage(stem);return}if(typeof window.navigateTo==='function'){window.navigateTo(stem);return}if(typeof window.switchPage==='function'){window.switchPage(stem);return}var all=document.querySelectorAll('[id^="page-"],[class~="page-section"],[data-page-id]');all.forEach(function(s){s.style.display='none';s.classList&&s.classList.remove('active')});var ids=['page-'+stem,stem+'-page',stem+'-section','section-'+stem,stem,'page-'+norm(stem)];for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el){el.style.display='block';el.classList&&el.classList.add('active');window.scrollTo(0,0);break}}document.querySelectorAll('[data-page]').forEach(function(a){a.classList&&a.classList.remove('active')});document.querySelectorAll('[data-page="'+stem+'"],[data-page="'+norm(stem)+'"]').forEach(function(a){a.classList&&a.classList.add('active')})}function stemFromHref(href){var h=(href||'').trim();if(!h)return'';if(/^(https?:)?\/\//i.test(h))return'';if(/^(mailto:|tel:|javascript:)/i.test(h))return'';if(h.indexOf('#page-')===0)return norm(h.slice(6));if(h.indexOf('#')===0)return'';var noQuery=h.split('?')[0].split('#')[0];if(/\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|json|pdf|xml|txt|zip|woff2?|ttf|otf)$/i.test(noQuery))return'';var noExt=noQuery.replace(/\.html?$/i,'');var base=noExt.split('/').filter(Boolean).pop()||noExt;base=base.split('\\').pop()||base;return norm(base)}function install(){document.querySelectorAll('[data-page]').forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();switchTo(norm(el.getAttribute('data-page')||''))})});document.querySelectorAll('a[href]').forEach(function(a){var stem=stemFromHref(a.getAttribute('href')||'');if(!stem)return;a.addEventListener('click',function(e){e.preventDefault();switchTo(stem)})})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',install,{once:true})}else{install()}})()<\/script>`

    const injectPreviewRuntime = (raw: string): string => {
      if (/<\/body>/i.test(raw)) return raw.replace(/<\/body>/i, `${simpleNavScript}${selectBridgeScript}</body>`)
      return `${raw}${simpleNavScript}${selectBridgeScript}`
    }

    // Hard fallback: render raw project HTML directly.
    // The previous transform/injection pipeline has produced repeated srcdoc parser
    // corruption in production for certain generated pages.
    const rawLower = html.trim().toLowerCase()
    if (rawLower.startsWith('<!doctype') || rawLower.startsWith('<html')) {
      return injectPreviewRuntime(html)
    }
    const fallbackCss = files["style.css"] || ""
    const fallbackJs = files["script.js"] || ""
    const safeFallbackJs = fallbackJs.replace(/<\/script/gi, '<\\/script')
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${fallbackCss}</style></head><body>${html}<script>${safeFallbackJs}<\/script>${simpleNavScript}${selectBridgeScript}</body></html>`

    // ── Sanitize </script> inside JS string literals ────────────────────────
    // AI models often write:  innerHTML = '</script>';  which makes the HTML
    // parser close the <script> block early → "Unexpected token '<'" in preview.
    //
    // Line-based with same-line closer support:
    //   - Detect true </script> even when JS appears before it on the same line.
    //   - Escape </script> only when parser state indicates string/template/comment context.
    const sanitizeScripts = (raw: string): string => {
      type JsLexState = {
        inSingle: boolean
        inDouble: boolean
        inTemplate: boolean
        inBlockComment: boolean
        escapeNext: boolean
      }

      const advanceJsState = (line: string, state: JsLexState): JsLexState => {
        let inLineComment = false
        const nextState: JsLexState = { ...state }

        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          const nx = line[i + 1]

          if (inLineComment) break

          if (nextState.inBlockComment) {
            if (ch === '*' && nx === '/') {
              nextState.inBlockComment = false
              i++
            }
            continue
          }

          if (nextState.inSingle || nextState.inDouble || nextState.inTemplate) {
            if (nextState.escapeNext) {
              nextState.escapeNext = false
              continue
            }

            if (ch === '\\') {
              nextState.escapeNext = true
              continue
            }

            if (nextState.inSingle && ch === "'") {
              nextState.inSingle = false
              continue
            }
            if (nextState.inDouble && ch === '"') {
              nextState.inDouble = false
              continue
            }
            if (nextState.inTemplate && ch === '`') {
              nextState.inTemplate = false
              continue
            }

            continue
          }

          if (ch === '/' && nx === '/') {
            inLineComment = true
            continue
          }

          if (ch === '/' && nx === '*') {
            nextState.inBlockComment = true
            i++
            continue
          }

          if (ch === "'") {
            nextState.inSingle = true
            continue
          }
          if (ch === '"') {
            nextState.inDouble = true
            continue
          }
          if (ch === '`') {
            nextState.inTemplate = true
          }
        }

        if (!nextState.inSingle && !nextState.inDouble && !nextState.inTemplate) {
          nextState.escapeNext = false
        }

        return nextState
      }

      const lines = raw.split('\n')
      let inScript = false
      let jsState: JsLexState = {
        inSingle: false,
        inDouble: false,
        inTemplate: false,
        inBlockComment: false,
        escapeNext: false,
      }

      return lines.map((line) => {
        const trimmed = line.trim()

        if (!inScript) {
          if (/<script(\s[^>]*)?>/i.test(line) && !/<\/script\s*>/i.test(line)) {
            inScript = true
            jsState = {
              inSingle: false,
              inDouble: false,
              inTemplate: false,
              inBlockComment: false,
              escapeNext: false,
            }
          }
          return line
        }

        // Recognize a real </script> closer even when inline with JS on the same line.
        const closeMatch = line.match(/<\/script\s*>/i)
        if (closeMatch && typeof closeMatch.index === 'number') {
          const closeIndex = closeMatch.index
          const beforeClose = line.slice(0, closeIndex)
          const stateBeforeClose = advanceJsState(beforeClose, jsState)
          const canCloseScript = !stateBeforeClose.inSingle && !stateBeforeClose.inDouble && !stateBeforeClose.inTemplate && !stateBeforeClose.inBlockComment
          if (canCloseScript) {
            const escapedPrefix = beforeClose.replace(/<\/script(\s*>)/gi, '<\\/script$1')
            inScript = false
            jsState = {
              inSingle: false,
              inDouble: false,
              inTemplate: false,
              inBlockComment: false,
              escapeNext: false,
            }
            return escapedPrefix + line.slice(closeIndex)
          }
        }

        const canCloseScript = !jsState.inSingle && !jsState.inDouble && !jsState.inTemplate && !jsState.inBlockComment
        if (canCloseScript && /^<\/script\s*>$/i.test(trimmed)) {
          inScript = false
          jsState = {
            inSingle: false,
            inDouble: false,
            inTemplate: false,
            inBlockComment: false,
            escapeNext: false,
          }
          return line
        }

        const escapedLine = line.replace(/<\/script(\s*>)/gi, '<\\/script$1')
        jsState = advanceJsState(line, jsState)
        return escapedLine
      }).join('\n')
    }
    html = sanitizeScripts(html)

    // Recover from AI-generated unclosed <script> blocks.
    // If script tags are unbalanced, the iframe parser can consume the rest of
    // the document as JS and throw "Unexpected end of input" at about:srcdoc EOF.
    const closeUnbalancedScripts = (raw: string): string => {
      const openTags = raw.match(/<script\b[^>]*>/gi)?.length || 0
      const closeTags = raw.match(/<\/script\s*>/gi)?.length || 0
      const missingClosers = Math.max(0, openTags - closeTags)
      if (missingClosers === 0) return raw

      const closers = Array(missingClosers).fill('</script>').join('')
      const bodyCloseIndex = raw.toLowerCase().lastIndexOf('</body>')
      if (bodyCloseIndex !== -1) {
        return `${raw.slice(0, bodyCloseIndex)}${closers}${raw.slice(bodyCloseIndex)}`
      }
      return `${raw}${closers}`
    }
    html = closeUnbalancedScripts(html)

    // ── Scrub rogue JS text nodes outside <script> tags ──────────────────────
    // AI sometimes leaves raw JS code (e.g. addEventListener calls) as bare text
    // between </footer> and </body>, which the browser renders visibly.
    // Strategy: if it looks like leaked JS text, DROP it (do not execute partial code).
    html = html.replace(
      /(<\/footer[^>]*>)(([\s\S]*?))(<\/body\s*>)/i,
      (_match: string, footerClose: string, between: string, _inner: string, bodyClose: string) => {
        const trimmed = between.trim()
        if (!trimmed) return footerClose + between + bodyClose
        // If it looks like raw JS (contains function calls/blocks and NO angle brackets)
        // Any '<' or '>' here is likely HTML/markup and wrapping it in <script> would crash with
        // "Unexpected token '<'" inside the iframe runtime.
        const looksLikeJs = /[;{}()]/.test(trimmed) && !/[<>]/.test(trimmed)
        if (looksLikeJs) {
          return footerClose + '\n' + bodyClose
        }
        return footerClose + between + bodyClose
      }
    )

    // Fallback scrub: if JS-like lines still leaked into body as plain text,
    // remove those lines so they don't render and don't create parser/runtime errors.
    // IMPORTANT: never remove lines that are inside real <script> blocks.
    html = html.replace(/<body[^>]*>([\s\S]*?)<\/body>/i, (fullBodyMatch: string, bodyInner: string) => {
      const jsLinePattern = /^\s*(?:document\.|window\.|const\s+|let\s+|var\s+|function\s+|if\s*\(|for\s*\(|while\s*\(|return\s+|querySelector(?:All)?\s*\(|addEventListener\s*\(|\}\s*\)?;?\s*$)/
      const lines = bodyInner.split('\n')
      let inScriptBlock = false
      const keptLines = lines.filter((line) => {
        const trimmed = line.trim()

        if (/<script(\s[^>]*)?>/i.test(line)) inScriptBlock = true
        if (inScriptBlock) {
          if (/<\/script\s*>/i.test(line)) inScriptBlock = false
          return true
        }

        if (!trimmed) return true
        if (trimmed.startsWith('//')) return true
        if (/[<>]/.test(trimmed)) return true
        if (jsLinePattern.test(trimmed)) {
          return false
        }
        return true
      })

      if (keptLines.length === lines.length) return fullBodyMatch
      return fullBodyMatch.replace(bodyInner, keptLines.join('\n'))
    })

    const replaceOutsideScripts = (raw: string, transform: (segment: string) => string): string => {
      const parts = raw.split(/(<script[\s\S]*?<\/script>)/gi)
      return parts.map((part, index) => (index % 2 === 0 ? transform(part) : part)).join('')
    }

    // Replace image paths with data URLs (handles quote styles + CSS url(), including prefixed/absolute variants)
    const imageKeys = Object.keys(files).filter(k => k.startsWith('images/'))
    if (imageKeys.length > 0) {
      const resolveImageData = (rawPath: string) => {
        const cleaned = rawPath.split('?')[0].split('#')[0]
        const normalized = cleaned.replace(/^\.\//, '').replace(/^\//, '')
        const imageIndex = normalized.indexOf('images/')
        const canonical = imageIndex >= 0 ? normalized.slice(imageIndex) : normalized
        return files[canonical] || files[normalized] || files[cleaned]
      }

      html = replaceOutsideScripts(html, (segment) => {
        // src="images/..." and src='images/...'
        let next = segment.replace(/src=(["'])([^"']*images\/[^"']+)\1/g, (_m, q, imgPath) => {
          const dataUrl = resolveImageData(imgPath)
          return dataUrl ? `src="${dataUrl}"` : `src=${q}${imgPath}${q}`
        })
        // CSS: url("images/...") url('images/...') url(images/...)
        next = next.replace(/url\((['"]?)([^'")]*images\/[^'")]+)\1\)/g, (_m, _q, imgPath) => {
          const dataUrl = resolveImageData(imgPath)
          return dataUrl ? `url("${dataUrl}")` : `url(${_q}${imgPath}${_q})`
        })
        return next
      })
    }

    // Normalize internal page links so preview/new-tab cannot navigate out to app routes.
    const toPageStem = (value: string): string => {
      const raw = String(value || '').trim()
      if (!raw) return ''
      let candidate = raw
      if (/^(https?:)?\/\//i.test(raw)) {
        try {
          const parsed = new URL(raw)
          if (!/(^|\.)ai\.aynbeirut\.dev$/i.test(parsed.hostname)) return ''
          candidate = `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`
        } catch {
          return ''
        }
      }
      if (/^(mailto:|tel:|javascript:)/i.test(raw)) return ''
      if (candidate.startsWith('#')) {
        if (candidate.startsWith('#page-')) return candidate.slice(6).toLowerCase().replace(/[^a-z0-9]/g, '')
        return ''
      }

      const noQuery = candidate.split('?')[0].split('#')[0]
      const normalizedPath = `/${noQuery.replace(/^\/+/, '')}`.toLowerCase()
      if (/^\/(auth|signin|dashboard|_next|api\/auth)(\/|$)/.test(normalizedPath)) return ''
      if (/\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|json|pdf|xml|txt|zip|woff2?|ttf|otf)$/i.test(noQuery)) return ''

      const noExt = noQuery.replace(/\.html?$/i, '')
      const base = (noExt.split('/').filter(Boolean).pop() || noExt).split('\\').pop() || noExt
      const stem = base
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      return stem === 'index' ? 'home' : stem
    }

    html = replaceOutsideScripts(html, (segment) =>
      segment.replace(/<a([^>]*?)href=(['"])([^'"]+)\2([^>]*)>/gi, (match: string, pre: string, _q: string, href: string, post: string) => {
        const stem = toPageStem(href)
        if (!stem) return match
        const hasDataPage = /\bdata-page\s*=\s*['"]/i.test(`${pre}${post}`)
        const dataPageAttr = hasDataPage ? '' : ` data-page="${stem}"`
        return `<a${pre}href="#page-${stem}"${dataPageAttr}${post}>`
      })
    )

    // Inject navigation interceptor via encoded data URL script to avoid inline-script serialization/parser edge cases in srcdoc.
    const navRuntime = `(function(){
      function norm(text){
        var src = String(text || '').toLowerCase();
        var out = '';
        for (var i = 0; i < src.length; i++) {
          var ch = src.charCodeAt(i);
          if ((ch >= 48 && ch <= 57) || (ch >= 97 && ch <= 122) || ch === 45 || ch === 95) out += src[i];
        }
        return out.replace(/-+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
      }
      function isBlockedPath(pathname){
        var p = String(pathname || '').toLowerCase();
        return p.indexOf('/auth') === 0 || p.indexOf('/signin') === 0 || p.indexOf('/dashboard') === 0 || p.indexOf('/_next') === 0 || p.indexOf('/api/auth') === 0;
      }
      function stemFromHref(raw){
        var value = String(raw || '').trim();
        if (!value) return '';
        if (value.indexOf('mailto:') === 0 || value.indexOf('tel:') === 0 || value.indexOf('javascript:') === 0) return '';
        if (value.indexOf('#page-') === 0) return norm(value.slice(6));
        if (value.indexOf('#') === 0) return '';
        if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0 || value.indexOf('//') === 0) {
          try {
            var parsed = new URL(value, window.location.href);
            var host = String(parsed.hostname || '').toLowerCase();
            if (!(host === 'ai.aynbeirut.dev' || host.endsWith('.ai.aynbeirut.dev'))) return '';
            if (isBlockedPath(parsed.pathname)) return 'home';
            value = parsed.pathname || '/';
          } catch { return ''; }
        }
        var clean = value.split('?')[0].split('#')[0];
        var normalizedPath = String(clean || '').toLowerCase();
        while (normalizedPath.indexOf('/') === 0) normalizedPath = normalizedPath.slice(1);
        normalizedPath = '/' + normalizedPath;
        if (isBlockedPath(normalizedPath)) return 'home';
        if (!clean) return '';
        var segs = clean.split('/').filter(Boolean);
        var last = segs.length ? segs[segs.length - 1] : 'home';
        if (!last) return '';
        var lower = last.toLowerCase();
        if (lower === 'index' || lower === 'index.html') return 'home';
        if (lower.endsWith('.html')) lower = lower.slice(0, -5);
        var ext = ['.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.ico','.css','.js','.json','.pdf','.xml','.txt','.zip','.woff','.woff2','.ttf','.otf'];
        for (var i = 0; i < ext.length; i++) if (lower.endsWith(ext[i])) return '';
        return norm(lower);
      }
      function switchTo(stem){
        if (!stem) return;
        if (typeof window.showPage === 'function') { window.showPage(stem); return; }
        if (typeof window.navigateTo === 'function') { window.navigateTo(stem); return; }
        if (typeof window.switchPage === 'function') { window.switchPage(stem); return; }
        var sections = document.querySelectorAll('[id^="page-"], [class~="page-section"], [data-page-id]');
        sections.forEach(function(el){ el.style.display = 'none'; if (el.classList) el.classList.remove('active'); });
        var ids = ['page-' + stem, stem + '-page', stem + '-section', 'section-' + stem, stem];
        var target = null;
        for (var j = 0; j < ids.length; j++) {
          target = document.getElementById(ids[j]);
          if (target) break;
        }
        if (!target) {
          var candidates = document.querySelectorAll('[data-page-id], [data-page], [data-section], section[id], main > section, [class*="page"]');
          for (var k = 0; k < candidates.length; k++) {
            var el = candidates[k];
            var values = [
              el.getAttribute && el.getAttribute('data-page-id'),
              el.getAttribute && el.getAttribute('data-page'),
              el.getAttribute && el.getAttribute('data-section'),
              el.getAttribute && el.getAttribute('id')
            ];
            var matched = false;
            for (var v = 0; v < values.length; v++) {
              var n = norm(values[v] || '');
              if (n === stem || n === ('page' + stem) || n === (stem + 'page') || n === (stem + 'section')) {
                matched = true;
                break;
              }
            }
            if (matched) {
              target = el;
              break;
            }
          }
        }
        if (target) {
          target.style.display = 'block';
          if (target.classList) target.classList.add('active');
          window.scrollTo(0,0);
        }
      }
      function rewriteAnchors(root){
        var scope = root && root.querySelectorAll ? root : document;
        if (!scope.querySelectorAll) return;
        scope.querySelectorAll('a[href]').forEach(function(anchor){
          var stem = stemFromHref(anchor.getAttribute('href') || '');
          if (!stem) return;
          anchor.setAttribute('href', '#page-' + stem);
          if (!anchor.getAttribute('data-page')) anchor.setAttribute('data-page', stem);
        });
      }
      function onClick(e){
        var node = e.target && e.target.closest ? e.target.closest('[data-page],a[href]') : null;
        if (!node) return;
        var stem = '';
        if (node.hasAttribute && node.hasAttribute('data-page')) stem = norm(node.getAttribute('data-page') || '');
        else stem = stemFromHref(node.getAttribute('href') || '');
        if (!stem) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        switchTo(stem);
      }
      window.addEventListener('click', onClick, true);
      document.addEventListener('click', onClick, true);
      window.addEventListener('submit', function(e){
        var form = e.target;
        if (!form || !form.getAttribute) return;
        var action = form.getAttribute('action') || '';
        if (!action || stemFromHref(action)) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
      }, true);
      rewriteAnchors(document);
      try {
        var observer = new MutationObserver(function(records){
          records.forEach(function(rec){
            if (rec.addedNodes && rec.addedNodes.length) {
              rec.addedNodes.forEach(function(n){ if (n && n.nodeType === 1) rewriteAnchors(n); });
            }
          });
        });
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      } catch {}
    })();`
    const navInterceptor = `<script src="data:text/javascript;charset=utf-8,${encodeURIComponent(navRuntime)}"></script>`

    // Inject error-catcher so JS errors get reported to the parent via postMessage
    // Filters out CORS/sandbox/network noise which are iframe artifacts, not real bugs
    const errorCatcher = ``

    const mobileFix = `<style id="__mobile_fix__">@media(max-width:768px){html,body{overflow-x:hidden!important}body>*{max-width:100%!important}img,video,iframe,table{max-width:100%!important}}</style>`
    if (html.trim().toLowerCase().startsWith("<!doctype") || html.trim().toLowerCase().startsWith("<html")) {
      const headClose = html.toLowerCase().indexOf('</head>')
      const bodyClose = html.toLowerCase().lastIndexOf('</body>')
      let result = headClose !== -1 ? html.slice(0, headClose) + mobileFix + html.slice(headClose) : html
      result = bodyClose !== -1 ? result.slice(0, bodyClose) + navInterceptor + errorCatcher + result.slice(bodyClose) : result + navInterceptor + errorCatcher
      return result
    }
    const css = files["style.css"] || ""
    const js = files["script.js"] || ""
    const safeJs = js.replace(/<\/script/gi, '<\\/script')
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${css}</style>${mobileFix}</head><body>${html}<script>${safeJs}</script>${navInterceptor}${errorCatcher}</body></html>`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files["index.html"], previewKey, imageFilesKey])
  const handleSaveProject = async () => {
    const gate = await validateConfidenceGates()
    if (!gate.ok) {
      setConfidenceIssues(gate.issues)
      setShowErrorPanel(true)
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      })
      
      if (response.ok) {
        setSaveSuccess(true)
        // Hide success message after 2 seconds
        setTimeout(() => setSaveSuccess(false), 2000)
      } else {
        console.error("Failed to save project")
      }
    } catch (error) {
      console.error("Error saving project:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[#0f0f0f]">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between py-3 bg-[#1a1a1a] border-b border-[#333] px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2a2a2a] rounded animate-pulse"></div>
            <div className="w-px h-6 bg-[#333]"></div>
            <div className="w-32 h-6 bg-[#2a2a2a] rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-6 bg-[#2a2a2a] rounded animate-pulse"></div>
            <div className="w-20 h-6 bg-[#2a2a2a] rounded animate-pulse"></div>
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 flex">
          <div className="w-1/3 bg-[#1a1a1a] border-r border-[#333] p-4 space-y-4">
            <div className="h-10 bg-[#2a2a2a] rounded animate-pulse"></div>
            <div className="h-64 bg-[#2a2a2a] rounded animate-pulse"></div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-[#0f0f0f]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
              <p className="text-gray-400 mt-4 text-sm">Loading project...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-white">Project not found</h2>
          <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0f0f0f]">
      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-[#1a1a1a] border border-white/10 text-white text-sm px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400" />
          Link copied to clipboard!
        </div>
      )}

      {/* Hosting Plans Modal */}
      {showHostingModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowHostingModal(null)
            setShowServerDnsSetup(false)
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {showHostingModal === 'cloud' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Cloud className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Cloud Hosting</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-1">$5<span className="text-lg text-gray-500">/month</span></p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-600 mb-4">
                    Perfect for small to medium websites. Fast, reliable, and easy to scale.
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <h4 className="font-semibold text-gray-900">What&apos;s included:</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                        10 GB SSD Storage
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                        100 GB Bandwidth
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                        Free SSL Certificate
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                        99.9% Uptime Guarantee
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                        24/7 Support
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900">🎉 Special Offer</p>
                    <p className="text-sm text-blue-700 mt-1">Get 2 months free when you pay annually!</p>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setShowHostingModal(null)
                      setShowServerDnsSetup(false)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Choose Plan
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Server className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Server Hosting</h3>
                    <p className="text-3xl font-bold text-purple-600 mt-1">$10<span className="text-lg text-gray-500">/month</span></p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-600 mb-4">
                    Reliable hosting space for a small website with practical essentials for businesses.
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <h4 className="font-semibold text-gray-900">What&apos;s included:</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-600"></div>
                        Simple hosting space for a small website
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-600"></div>
                        2 professional email accounts on your domain (for example: info@, admin@, support@, customer@)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-600"></div>
                        Option to host email externally (Zoho or other providers)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-600"></div>
                        Free SSL certificate
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-600"></div>
                        Weekly automatic backup
                      </li>
                    </ul>
                  </div>

                  {showServerDnsSetup && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium text-purple-900">Email DNS Setup (if using external email provider)</p>
                      <input
                        type="text"
                        placeholder="MX record (example: mx.zoho.com)"
                        className="w-full text-xs px-2.5 py-2 border border-purple-200 rounded-md bg-white"
                      />
                      <input
                        type="text"
                        placeholder="SPF record (example: v=spf1 include:zoho.com ~all)"
                        className="w-full text-xs px-2.5 py-2 border border-purple-200 rounded-md bg-white"
                      />
                      <input
                        type="text"
                        placeholder="DKIM record (selector._domainkey)"
                        className="w-full text-xs px-2.5 py-2 border border-purple-200 rounded-md bg-white"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setShowHostingModal(null)
                      setShowServerDnsSetup(false)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setShowServerDnsSetup(true)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Choose Plan
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between py-3 bg-[#1a1a1a] border-b border-[#333]">
        {/* Left Section */}
        <div className="flex items-center gap-3 pl-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="h-6 w-px bg-[#333]"></div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-sm">
              {project.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-white">{project.name}</span>
          </div>
        </div>

        {/* Center Section - Action Buttons */}
        <div className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/10"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/10"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          <div className="h-6 w-px bg-[#333] mx-2"></div>
          
          {/* Screen Size Toggle */}
          <div className="flex items-center gap-1 bg-[#15181d] border border-[#2b313a] rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScreenSize('desktop')}
              className={`h-7 w-7 p-0 !font-normal ${screenSize === 'desktop' ? 'bg-[#232a33] text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1d232b]'}`}
              title="Desktop View"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScreenSize('tablet')}
              className={`h-7 w-7 p-0 !font-normal ${screenSize === 'tablet' ? 'bg-[#232a33] text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1d232b]'}`}
              title="Tablet View"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScreenSize('mobile')}
              className={`h-7 w-7 p-0 !font-normal ${screenSize === 'mobile' ? 'bg-[#232a33] text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1d232b]'}`}
              title="Mobile View"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="h-6 w-px bg-[#333] mx-2"></div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshPreview}
            className="text-gray-400 hover:text-white hover:bg-white/10 gap-2"
            title="Refresh Preview"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Refresh</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewInBrowser}
            className="text-gray-400 hover:text-white hover:bg-white/10 gap-2"
            title="Open preview in new tab"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="text-sm">View</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCode(v => !v)}
            className={`gap-2 ${showCode ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Code className="h-4 w-4" />
            <span className="text-sm">Code</span>
          </Button>
          
          <div className="relative" ref={settingsMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettingsMenu(v => !v)}
              className="text-gray-400 hover:text-white hover:bg-white/10 gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">Settings</span>
            </Button>
            {showSettingsMenu && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-52 py-1 overflow-hidden">
                {[{ step: 1, icon: '📝', label: 'Info' },
                  { step: 2, icon: '🎨', label: 'Template' },
                  { step: 3, icon: '✨', label: 'Style' },
                  { step: 4, icon: '🧭', label: 'Navigation & Pages' },
                  { step: 5, icon: '🧱', label: 'Stage Builder' },
                  { step: 6, icon: '🖼️', label: 'Assets' },
                  { step: 7, icon: '✅', label: 'Save' }].map(({ step, icon, label }) => (
                  <button
                    key={step}
                    onClick={() => {
                      setShowSettingsMenu(false)
                      router.push(`/dashboard/projects/${projectId}/edit?step=${step}`)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 pr-4">
          {/* Credits Display */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#2a2a2a] rounded-lg border border-[#333]">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-white">{session?.user?.credits || 0} Credits</span>
          </div>
          
          <div className="hidden md:block h-6 w-px bg-[#333]"></div>
          {/* Hosting Plans */}
          <div className="hidden md:flex items-center gap-1 mr-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setShowServerDnsSetup(false)
                setShowHostingModal('cloud')
              }}
              className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              title="Cloud Hosting"
            >
              <Cloud className="h-3 w-3" />
              <span className="font-medium">Cloud</span>
            </Button>
            
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setShowServerDnsSetup(false)
                setShowHostingModal('server')
              }}
              className="border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
              title="Server Hosting"
            >
              <Server className="h-3 w-3" />
              <span className="font-medium">Server</span>
            </Button>
          </div>
          
          <div className="hidden md:block h-6 w-px bg-gray-300"></div>
          
          <Button
            variant="outline"
            size="xs"
            onClick={handleCopyShareLink}
            className="hidden md:flex border-gray-300 text-gray-700 hover:bg-gray-50 ml-2"
            title="Copy shareable link"
          >
            <Share2 className="h-3 w-3" />
            <span>Share</span>
          </Button>
          
          <Button
            variant="outline"
            size="xs"
            className="hidden md:flex border-gray-300 text-gray-700 hover:bg-gray-50"
            title="Export to GitHub Repository"
          >
            <Github className="h-3 w-3" />
          </Button>
          
          <Button
            size="xs"
            onClick={handleSaveProject}
            disabled={isSaving || autoFixActive || previewErrors.length > 0 || !!fixPrompt || isAiGenerating || isApplyingUpdate}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-70"
            title={
              autoFixActive || previewErrors.length > 0 || !!fixPrompt
                ? 'Auto-fixing preview errors before publishing'
                : 'Save and publish project'
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                <span>Saving...</span>
              </>
            ) : autoFixActive || previewErrors.length > 0 || !!fixPrompt ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                <span>Fixing...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Publish</span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden md:flex-row flex-col min-h-0">
        {/* AI Assistant Panel */}
        {isChatVisible && (
          <div className={`border-r border-[#222] bg-[#0f0f0f] flex flex-col relative
            ${ mobileTab === 'chat' ? 'flex w-full md:w-[360px] md:flex-none' : 'hidden md:flex md:w-[360px] md:flex-none' }`}
          >
            <div className="absolute top-3 right-3 z-10 hidden md:block">
              <button
                onClick={() => setIsChatVisible(false)}
                className="p-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg transition-colors"
                title="Hide Chat"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <AIChat 
              projectId={projectId} 
              projectFiles={files}
              projectImageData={pageImages}
              selectedElementContext={selectedElementContext || undefined}
              onSelectionContextConsumed={() => setSelectedElementContext(null)}
              previewSelectMode={selectMode}
              onTogglePreviewSelectMode={() => {
                setSelectMode((previous) => !previous)
                if (mobileTab !== 'preview') setMobileTab('preview')
              }}
              initialMode={initialAiMode}
              onCodeGenerated={handleCodeGenerated}
              onLoadingChange={setIsAiGenerating}
              onValidateBuild={validateConfidenceGates}
              onRequestPreview={handleRefreshPreview}
              onRequestRollback={handleRollbackLatest}
              autoFixRetries={autoFixAttempts}
              onFilesUpdated={async (updatedFiles) => {
                const newFiles = { ...files, ...updatedFiles }
                setFiles(newFiles)
                // Persist the updated files (e.g. project.md recap) to the DB
                try {
                  await fetch(`/api/projects/${projectId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: newFiles }),
                  })
                } catch {}
              }}
              initialBuildPrompt={newProjectPrompt}
              isNewProject={isNewProject}
              settingsUpdated={settingsUpdated}
              onSettingsUpdateDismiss={() => setSettingsUpdated(false)}
              fixPrompt={fixPrompt}
              onFixPromptConsumed={() => setFixPrompt(null)}
            />
          </div>
        )}

        {/* Show Chat Button (when hidden on desktop) */}
        {!isChatVisible && (
          <button
            onClick={() => setIsChatVisible(true)}
            className="hidden md:flex fixed left-4 bottom-4 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl shadow-lg z-50 transition-all duration-200"
            title="Show AI Assistant"
          >
            <ChevronRight className="h-5 w-5" />
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">Show AI Assistant</span>
          </button>
        )}

        {/* Preview / Code Area */}
        <div className={`flex-1 flex flex-col min-h-0
          ${ mobileTab === 'preview' ? 'flex' : 'hidden md:flex' }`}
        >
          {showCode ? (
            /* ── VS Code-style editor ── */
            <div className="flex flex-col flex-1 min-h-0 bg-[#1e1e1e]">
              {/* Title bar */}
              <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] px-0 shrink-0">
                {/* index.html tab */}
                <button
                  onClick={() => setCodeTab('index.html')}
                  className={`flex items-center gap-1.5 px-4 py-2 border-r border-[#3c3c3c] text-xs select-none transition-colors ${
                    codeTab === 'index.html' ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-[#2d2d2d] text-[#969696] hover:text-[#cccccc]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <path d="M2 2h7l3 3v9H2V2z" fill="#e8834d" opacity=".9"/>
                    <path d="M9 2v3h3" fill="none" stroke="#e8834d" strokeWidth="1"/>
                  </svg>
                  index.html
                </button>
                {/* project.md tab — only show if it exists */}
                {files['project.md'] && (
                  <button
                    onClick={() => setCodeTab('project.md')}
                    className={`flex items-center gap-1.5 px-4 py-2 border-r border-[#3c3c3c] text-xs select-none transition-colors ${
                      codeTab === 'project.md' ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-[#2d2d2d] text-[#969696] hover:text-[#cccccc]'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <path d="M2 2h7l3 3v9H2V2z" fill="#6b9ae8" opacity=".9"/>
                      <path d="M9 2v3h3" fill="none" stroke="#6b9ae8" strokeWidth="1"/>
                    </svg>
                    project.md
                  </button>
                )}
                <div className="flex-1" />
                <span className="text-[10px] text-[#6b6b6b] pr-3 select-none">
                  {codeTab === 'project.md' ? 'project brief · read-only' : 'read-only editing · no export'}
                </span>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 min-h-0">
                {filesLoading ? (
                  <div className="h-full bg-[#1e1e1e] flex flex-col gap-3 p-6">
                    {[80,60,45,70,55,90,40,65].map((w,i) => (
                      <div key={i} className="h-4 bg-[#2a2a2a] rounded animate-pulse" style={{width:`${w}%`, animationDelay:`${i*0.07}s`}} />
                    ))}
                  </div>
                ) : (
                <MonacoEditor
                  key={codeTab}
                  height="100%"
                  theme="vs-dark"
                  language={codeTab === 'project.md' ? 'markdown' : 'html'}
                  value={codeTab === 'project.md' ? (files['project.md'] || '') : (files['index.html'] || '')}
                  onChange={(value) => {
                    if (codeTab !== 'project.md') {
                      setFiles(prev => ({ ...prev, 'index.html': value || '' }))
                    }
                  }}
                  onMount={(editor, monaco) => {
                    // Disable copy shortcuts
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {})
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {})
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {})
                  }}
                  options={{
                    fontSize: 13,
                    readOnly: codeTab === 'project.md',
                    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    // placeholder handled by filesLoading skeleton above
                    automaticLayout: true,
                    wordWrap: 'off',
                    tabSize: 2,
                    renderLineHighlight: 'all',
                    contextmenu: false,
                    find: { seedSearchStringFromSelection: 'never' },
                    suggest: { showWords: false },
                    quickSuggestions: true,
                    folding: true,
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indentation: true },
                    renderWhitespace: 'selection',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    padding: { top: 8, bottom: 8 },
                    overviewRulerBorder: false,
                    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                  }}
                />
                )}
              </div>

              {/* VS Code-style status bar */}
              <div className="shrink-0 flex items-center justify-between bg-[#007acc] text-white text-[11px] px-3 py-0.5 select-none">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 opacity-80">
                      <Code className="h-3 w-3" /> {codeTab === 'project.md' ? 'Markdown' : 'HTML'}
                  </span>
                  <span className="opacity-60">UTF-8</span>
                </div>
                <span className="opacity-70">{project?.name}</span>
              </div>
            </div>
          ) : (
            /* ── Live Preview ── */
            <>
              <div className="hidden md:flex py-3 border-b border-[#222] bg-[#1a1a1a] items-center justify-between px-4 shrink-0">
                <h2 className="text-sm md:text-lg font-medium text-white">Live Preview</h2>
                <div className="text-xs md:text-sm text-gray-400">
                  {screenSize === 'desktop' && '100% Width'}
                  {screenSize === 'tablet' && '768px Width'}
                  {screenSize === 'mobile' && '375px Width'}
                </div>
              </div>

              {/* Undo banner — shown right after AI applies a new version */}
              {undoHtml !== null && !isApplyingUpdate && (
                <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-green-900/70 to-blue-900/70 border-b border-green-500/30">
                  <div className="flex items-center gap-2 text-sm text-green-200 min-w-0">
                    <span className="text-base shrink-0">✅</span>
                    <span className="font-medium whitespace-nowrap">Preview updated</span>
                    <span className="text-green-400 text-xs hidden sm:block">— new version applied to preview</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        const prev = undoHtml
                        setUndoHtml(null)
                        const updatedFiles = { ...files, 'index.html': prev || '' }
                        setFiles(updatedFiles)
                        setPreviewKey(k => k + 1)
                        try {
                          await fetch(`/api/projects/${projectId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ files: updatedFiles }),
                          })
                        } catch {}
                      }}
                      className="px-3 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
                    >
                      ↩ Undo
                    </button>
                    <button
                      onClick={() => setUndoHtml(null)}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className={`min-h-0 ${screenSize === 'desktop' ? 'flex-1 bg-white' : 'flex-1 flex items-center justify-center bg-gray-100'}`}>
                {isApplyingUpdate ? (
                  <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                      <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin absolute top-2 left-2 animate-reverse"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mt-6">✨ Updating Preview</h3>
                    <p className="text-purple-300 mt-2 text-center max-w-md px-4">Applying your new version…</p>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : isAiGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                      <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin absolute top-2 left-2 animate-reverse"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mt-6">✨ Creating Your Website</h3>
                    <p className="text-purple-300 mt-2 text-center max-w-md px-4">
                      Our AI is crafting your website… This may take a few moments.
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : filesLoading ? (
                  <div className="flex flex-col items-center justify-center h-full bg-[#0f0f0f] gap-4">
                    <div className="w-full max-w-2xl px-8 space-y-3">
                      <div className="h-8 bg-[#1a1a1a] rounded-lg animate-pulse w-3/4 mx-auto" />
                      <div className="h-4 bg-[#1a1a1a] rounded animate-pulse w-full" />
                      <div className="h-4 bg-[#1a1a1a] rounded animate-pulse w-5/6" />
                      <div className="h-32 bg-[#1a1a1a] rounded-xl animate-pulse w-full mt-4" />
                      <div className="h-4 bg-[#1a1a1a] rounded animate-pulse w-2/3" />
                      <div className="h-4 bg-[#1a1a1a] rounded animate-pulse w-3/4" />
                    </div>
                    <p className="text-gray-500 text-xs">Loading preview…</p>
                  </div>
                ) : screenSize === 'desktop' ? (
                  <iframe
                    ref={iframeRef}
                    key={previewKey}
                    srcDoc={previewHtml}
                    className="w-full h-full border-0 bg-white"
                    title="Preview"
                    sandbox="allow-scripts allow-forms allow-modals"
                    onLoad={() => sendSelectModeToPreview(selectMode)}
                  />
                ) : (
                  <div
                    className={`overflow-hidden shadow-2xl rounded-lg bg-white transition-all duration-300 ${
                      screenSize === 'tablet' ? 'w-full max-w-[768px] h-full' : 'w-full max-w-[375px] h-full'
                    }`}
                  >
                    <iframe
                      ref={iframeRef}
                      key={previewKey}
                      srcDoc={previewHtml}
                      className="w-full h-full border-0 bg-white"
                      title="Preview"
                      sandbox="allow-scripts allow-forms allow-modals"
                      onLoad={() => sendSelectModeToPreview(selectMode)}
                    />
                  </div>
                )}              </div>

              {/* Error panel — shown when the preview iframe reports JS errors */}
              {showErrorPanel && (previewErrors.length > 0 || confidenceIssues.length > 0) && (
                <div className="shrink-0 border-t border-red-500/30 bg-red-950/60 backdrop-blur-sm">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-xs font-semibold text-red-300">{previewErrors.length + confidenceIssues.length} issue{previewErrors.length + confidenceIssues.length > 1 ? 's' : ''} detected {autoFixAttempts >= MAX_AUTO_FIX_ATTEMPTS ? '(auto-fix limit reached)' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={previewErrors.length === 0}
                        onClick={() => {
                          if (previewErrors.length === 0) return
                          setAutoFixActive(true)
                          setAutoFixAttempts(prev => prev + 1)
                          setFixPrompt(buildFixPromptFromErrors(Array.from(new Set(previewErrors)).slice(-6)))
                          setShowErrorPanel(false)
                          setPreviewErrors([])
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        <Wrench className="w-3 h-3" />
                        Fix with AI
                      </button>
                      <button onClick={() => setShowErrorPanel(false)} className="text-red-400 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-3 pb-2 space-y-1 max-h-28 overflow-y-auto">
                    {previewErrors.map((err, i) => (
                      <div key={i} className="text-[10px] font-mono text-red-300 bg-red-900/40 rounded px-2 py-1 break-all">{err}</div>
                    ))}
                    {confidenceIssues.map((issue, i) => (
                      <div key={`gate-${i}`} className="text-[10px] text-amber-200 bg-amber-900/30 rounded px-2 py-1 break-all">{issue}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden shrink-0 flex bg-[#1a1a1a] border-t border-[#333]">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
              ${mobileTab === 'chat' ? 'text-white border-t-2 border-blue-500 -mt-px' : 'text-gray-400'}`}
          >
            <Sparkles className="h-4 w-4" />
            AI Chat
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
              ${mobileTab === 'preview' ? 'text-white border-t-2 border-blue-500 -mt-px' : 'text-gray-400'}`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>
    </div>
  )
}
