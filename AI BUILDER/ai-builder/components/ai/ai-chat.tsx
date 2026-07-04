'use client'

/**
 * AI Chat Component - v5.0.0
 * Build: 1771962693487
 * Layout: model dropdown + mode dropdown + attach button at bottom
 */

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Paperclip, Send, Bot, Cpu, ChevronDown, FolderOpen, HardDrive, X, FileText, LocateFixed } from 'lucide-react'
import { getCapabilityPromptBlock } from '@/lib/wizard-capabilities'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface RequestMetrics {
  mode: AIMode
  provider: string
  model: string
  latencyMs: number
  ttftMs?: number
  inputTokens?: number
  outputTokens?: number
  cost?: number
  creditsUsed?: number
  patchRetries?: number
  autoFixRetries?: number
  success?: boolean
}

interface PlannerChecklist {
  known: string[]
  missing: string[]
  progress: number
}

type AIMode = 'agent' | 'planner'

interface AIChatProps {
  projectId: string
  onCodeGenerated?: (code: string) => void
  onLoadingChange?: (isLoading: boolean) => void
  onFilesUpdated?: (files: Record<string, string>) => void
  onValidateBuild?: () => Promise<{ ok: boolean; issues: string[] }>
  onRequestPreview?: () => void
  onRequestRollback?: () => void
  autoFixRetries?: number
  projectFiles?: Record<string, string>
  projectImageData?: Record<string, Record<string, string>>
  initialMessage?: string
  initialMode?: AIMode
  /** Prompt shown in the "Build my website" card for new/generic projects */
  initialBuildPrompt?: string
  /** When true, show "Ready to build?" card instead of auto-sending */
  isNewProject?: boolean
  /** When true, show "Settings updated — want to rebuild?" card */
  settingsUpdated?: boolean
  /** Called when the settings card is dismissed */
  onSettingsUpdateDismiss?: () => void
  /** When set, auto-send this message (used for error auto-fix loop) */
  fixPrompt?: string | null
  /** Called after fixPrompt is consumed */
  onFixPromptConsumed?: () => void
  /** Selected preview element context (one-shot target hint for next edit request) */
  selectedElementContext?: string
  /** Called when selected target context should be cleared */
  onSelectionContextConsumed?: () => void
  /** Current preview select mode state */
  previewSelectMode?: boolean
  /** Toggle preview select mode */
  onTogglePreviewSelectMode?: () => void
}

const AI_MODELS = [
  { value: 'qwen|qwen3-coder-plus',                        label: 'Qwen 3 Coder (Direct)',  credits: 'x1' },
  { value: 'openrouter|qwen/qwen-2.5-coder-32b-instruct',  label: 'OpenRouter (Qwen)',       credits: 'x1' },
  { value: 'deepseek|deepseek-coder',                      label: 'DeepSeek Coder',          credits: 'x1' },
  { value: 'anthropic|claude-3-haiku-20240307',            label: 'Claude 3 Haiku',          credits: 'x2' },
  { value: 'openai|gpt-3.5-turbo',                         label: 'GPT-3.5 Turbo',           credits: 'x2' },
  { value: 'anthropic|claude-3-5-sonnet-20241022',         label: 'Claude 3.5 Sonnet',       credits: 'x5' },
  { value: 'openai|gpt-4',                                 label: 'GPT-4',                   credits: 'x5' },
]

const DEFAULT_BUILDER_MODEL = 'anthropic|claude-3-haiku-20240307'
const DEEPSEEK_MODEL_PREFIX = 'deepseek|'

const MAX_HISTORY_MESSAGES = 8
const MAX_HISTORY_MESSAGE_CHARS = 1600
const MAX_BRIEF_CHARS = 7000
const MAX_CURRENT_HTML_CHARS = 3500
const MAX_INPUT_HEIGHT_PX = 112

function clipText(value: string, maxChars: number): string {
  if (!value || value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}\n...[truncated]`
}

function slimProjectBrief(md?: string): string | undefined {
  if (!md?.trim()) return md
  if (md.length <= MAX_BRIEF_CHARS) return md

  const checklistIdx = md.indexOf('## Pre-Build Focus Checklist')
  if (checklistIdx !== -1) {
    const head = clipText(md.slice(0, Math.floor(MAX_BRIEF_CHARS * 0.65)), Math.floor(MAX_BRIEF_CHARS * 0.65))
    const checklist = clipText(md.slice(checklistIdx), Math.floor(MAX_BRIEF_CHARS * 0.35))
    return `${head}\n\n${checklist}`
  }

  return clipText(md, MAX_BRIEF_CHARS)
}

function compactHistory(history: Message[]): Message[] {
  return history.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.role,
    content: clipText(message.content, MAX_HISTORY_MESSAGE_CHARS),
  }))
}

type ChecklistGroup = 'business' | 'pages' | 'assets' | 'backend' | 'hosting' | 'other'

function classifyChecklistItem(item: string): ChecklistGroup {
  const value = item.toLowerCase()
  if (/brand|audience|goal|cta|contact/.test(value)) return 'business'
  if (/page|section|block/.test(value)) return 'pages'
  if (/asset|logo|portfolio|testimonial|proof|image/.test(value)) return 'assets'
  if (/backend|form|newsletter|blog|booking|shop|quiz/.test(value)) return 'backend'
  if (/hosting|cloud|domain|smtp|storage|webhook|db/.test(value)) return 'hosting'
  return 'other'
}

function groupMissingChecklist(items: string[]): Record<ChecklistGroup, string[]> {
  const grouped: Record<ChecklistGroup, string[]> = {
    business: [],
    pages: [],
    assets: [],
    backend: [],
    hosting: [],
    other: [],
  }
  for (const item of items) grouped[classifyChecklistItem(item)].push(item)
  return grouped
}

function buildStyleLockInstruction(locks: { colors: boolean; fonts: boolean; layout: boolean }): string {
  const constraints: string[] = []
  if (locks.colors) constraints.push('keep existing color palette unchanged')
  if (locks.fonts) constraints.push('keep existing typography/font choices unchanged')
  if (locks.layout) constraints.push('keep existing layout/section order unchanged')
  if (constraints.length === 0) return ''
  return `\n\nSTYLE LOCKS: ${constraints.join('; ')}.`
}

function extractSectionIds(html: string): Set<string> {
  const sectionIds = new Set<string>()
  const sectionMatches = html.matchAll(/<(section|div)\s+[^>]*id=["']([^"']+)["']/gi)
  for (const match of sectionMatches) {
    const id = match[2]
    if (id.startsWith('page-') || id.includes('section') || id.includes('hero') || id.includes('contact')) {
      sectionIds.add(id)
    }
  }
  return sectionIds
}

function createChangeSummary(previousHtml: string, nextHtml: string): string[] {
  const summary: string[] = []
  const previousSections = extractSectionIds(previousHtml)
  const nextSections = extractSectionIds(nextHtml)
  const addedSections = [...nextSections].filter((sectionId) => !previousSections.has(sectionId))
  const touchedPages = [...nextSections].filter((sectionId) => sectionId.startsWith('page-')).length
  const navLinkCount = (nextHtml.match(/class=["'][^"']*nav-link[^"']*["']/gi) || []).length

  if (touchedPages > 0) summary.push(`${touchedPages} page section(s) present`)
  if (addedSections.length > 0) summary.push(`added sections: ${addedSections.slice(0, 4).join(', ')}`)
  if (navLinkCount > 0) summary.push(`nav links updated (${navLinkCount})`)
  if (/api\//i.test(nextHtml) || /fetch\(/i.test(nextHtml)) summary.push('backend assumptions detected (API/fetch usage)')
  if (summary.length === 0) summary.push('structure and styling refined')
  return summary
}

function parsePlannerChecklist(content: string): PlannerChecklist | null {
  const lines = content.split('\n').map((line) => line.trim())
  const known: string[] = []
  const missing: string[] = []

  let section: 'known' | 'missing' | null = null
  for (const line of lines) {
    const normalized = line.toLowerCase()
    if (normalized.startsWith('### known') || normalized.startsWith('known')) {
      section = 'known'
      continue
    }
    if (normalized.startsWith('### missing') || normalized.startsWith('missing')) {
      section = 'missing'
      continue
    }
    if (line.startsWith('- ')) {
      const item = line.slice(2).trim()
      if (!item || item.toLowerCase() === 'none yet' || item.toLowerCase() === 'no critical gaps detected') continue
      if (section === 'known') known.push(item)
      if (section === 'missing') missing.push(item)
    }
  }

  if (known.length === 0 && missing.length === 0) return null
  const total = known.length + missing.length
  const progress = total > 0 ? Math.round((known.length / total) * 100) : 0
  return { known, missing, progress }
}

function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function isBuildIntent(messageText: string): boolean {
  const normalized = messageText.toLowerCase()
  return /\b(build|create|make|add|change|fix|redesign|update|rebuild|redo|revamp|implement|generate)\b/.test(normalized)
}

function extractPlannerQuickOptions(content: string): string[] {
  const options: string[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(/^[A-D][\)\.\-:]\s+(.{2,120})$/)
    if (!match) continue
    const optionText = match[1].trim()
    if (!optionText) continue
    if (!options.includes(optionText)) options.push(optionText)
    if (options.length >= 4) break
  }
  return options
}

function ensureInteractivePlannerReply(content: string, checklist: PlannerChecklist | null): string {
  if (!content.trim()) return content
  if (content.includes('PLAN_READY')) return content
  if (extractPlannerQuickOptions(content).length > 0) return content

  const groupedMissing = checklist ? groupMissingChecklist(checklist.missing) : null
  const dynamic: string[] = []
  if (groupedMissing?.business.length) dynamic.push('I will share business goals and audience details now')
  if (groupedMissing?.pages.length) dynamic.push('Let us finalize pages and section structure first')
  if (groupedMissing?.assets.length) dynamic.push('I will provide content/assets (logo, testimonials, images)')
  if (groupedMissing?.backend.length) dynamic.push('I need backend features like forms/newsletter/booking')
  if (groupedMissing?.hosting.length) dynamic.push('I need hosting/domain/cloud setup included in the plan')

  const options = [
    dynamic[0] || 'Use smart defaults and continue quickly',
    dynamic[1] || 'Ask me one focused question at a time',
    dynamic[2] || 'I will provide exact custom details now',
  ]

  return `${content.trim()}\n\nQuestion: Which option should we take next?\nA) ${options[0]}\nB) ${options[1]}\nC) ${options[2]}\nType custom: your exact preference in one line.`
}

function getAgentSystemPrompt(currentHtml?: string, md?: string): string {
  const slimMd = slimProjectBrief(md)
  const projectName = slimMd?.match(/\*\*Brand Name:\*\*\s*(.+)/i)?.[1]?.trim() ||
                      slimMd?.match(/^#\s+(?:Project Brief:\s*)?(.+)/m)?.[1]?.trim() || ''
  const htmlIsGeneric = !currentHtml || currentHtml.trim().length < 500 ||
    ['modern website','build something amazing','your creative space','yourbrand','nexus',
     'transform your digital','innovative solutions'].some(t =>
      currentHtml.toLowerCase().includes(t.toLowerCase())) ||
    (projectName.length > 2 && !currentHtml.toLowerCase().includes(projectName.toLowerCase().slice(0, 4)))

  const capabilityBlock = getCapabilityPromptBlock()

  const base = `You are an expert website builder AI working for AI Builder company.

⚠️ MODE DETECTION — READ THIS FIRST, ALWAYS:
BUILD MODE triggers ONLY on these explicit action words: build, create, make, add, change, fix, redesign, update, rebuild, redo, revamp, implement, generate.
QUESTION/FEEDBACK mode (same response style, no code) triggers on everything else: greetings, thanks, bug reports, "why/how" questions, or unclear requests.
RULE: Never start a build unless the user's message contains an explicit build action word.

BUILD MODE (explicit build request only) — output ONLY:
\`\`\`html
[complete single-file HTML]
\`\`\`
\`\`\`project.md
[updated project brief]
\`\`\`

QUESTION/FEEDBACK mode (everything else) — reply conversationally, NO code, max 3 sentences. Be brief and friendly.

!!! RULE #1 — SINGLE FILE, ALWAYS !!!
Output EXACTLY ONE \`\`\`html block. NEVER output multiple code blocks. ALL pages (Home, About, Product, Contact, etc.) MUST be inside that ONE file as hidden sections shown via JavaScript. Nav links MUST call a showPage() JS function — NEVER use href="about.html" or href="product.html". Separate .html links are BROKEN in the preview.

BUILD RULES:
- project.md is SOURCE OF TRUTH — brand name, colors, pages, images
- Treat wizard/project.md settings as HARD CONSTRAINTS, but not as the visual limit. Preserve the user's chosen pages, sections, colors, layout intent, and assets, then elevate the result with strong design judgment.
- Do NOT build the site too literally from rough user wording. First understand the business intent, then transform it into a polished, premium, well-structured website with clear hierarchy, spacing, typography, CTA placement, and modern visual rhythm.
- Add your AI Builder magic WITHOUT ignoring the wizard: improve layout, copy clarity, section flow, visual balance, responsiveness, and polish — while staying faithful to the user's customization.
- Avoid ugly/raw layouts: no random block stacking, weak spacing, generic gradients, or placeholder-looking composition unless the brief explicitly asks for it.
- CONTENT UPGRADE RULE: Rewrite weak or rough user text into polished marketing copy. Preserve facts, brand meaning, and claims, but improve headings, subheadings, benefit bullets, CTA copy, and section flow. Never dump raw wizard text directly into the page without refinement.
- DESIGN QUALITY RULE: The result must feel intentional and premium, not just correct. Use strong hero composition, clear typography scale, generous spacing, consistent card/button styles, visual contrast, and at least one memorable focal section per page.
- Multiple pages → ALL inside ONE file. EVERY page listed in the brief MUST have its own <section id="page-[name]">. Example: Home → <section id="page-home">, About Us → <section id="page-about">, Product → <section id="page-product">, Contact → <section id="page-contact">
- If project.md lists more than 1 page, you MUST build all listed pages. Never merge them into one scrolling landing page and never ignore wizard page names.
- The Build Architecture section in project.md is mandatory. Follow its exact page names, `data-page` values, and `page-*` section ids.
- ALL page sections hidden by default with CSS: .page-section { display: none; } and first page shown: #page-home { display: block; }
- EXACT NAV TEMPLATE — copy this pattern, do not invent alternatives:
  HTML: <a href="#" class="nav-link" data-page="home">Home</a> (use data-page for each page)
  JS: function showPage(id) { document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none'); document.getElementById('page-' + id).style.display = 'block'; document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active')); document.querySelector('[data-page="' + id + '"]').classList.add('active'); }
  Then wire: document.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', e => { e.preventDefault(); showPage(a.dataset.page); }));
- IMAGE PLACEMENT RULES — each image key maps to a SPECIFIC location. Never dump images in a list or catalog. Each image appears exactly once, in the section it was designed for:
  • "background" image → CSS background-image on the page wrapper or main hero section (never an <img> tag)
  • "hero" image → prominent <img> INSIDE the hero/banner section, full-width, visually dominant
  • "content" image → <img> alongside text in the About or Services section
  • "footer_bg" image → CSS background-image on the <footer> element
  • "slide_N" images → <img> elements INSIDE carousel/slider <li> or slide divs, in order (slide_1 first, slide_2 second…)
  • "gallery_N" images → <img> elements inside gallery grid cells, in order
  If the brief mentions a carousel, build a real CSS/JS carousel with prev/next controls using the slide_N images. If it mentions a gallery, build a responsive image grid using the gallery_N images.
- Every listed image MUST appear with exact src path (e.g. src="images/home-hero.jpg")
- Brand name from brief in navbar/title/footer — never use generic placeholder names
- Colors from brief applied to buttons/headers/accents
- Use tasteful defaults when the brief is incomplete: create a strong hero, clean section rhythm, consistent card/button system, and premium spacing scale that matches the selected style.
- If the user content is sparse, infer a stronger headline, sharper value proposition, better section labels, and more persuasive CTA copy from the business type and selected style.
- File/workspace structure rule: keep pages as in-file sections and only local project paths (\`images/...\`). Never create broken external file links.
- Before saying "done", ensure there are zero preview/runtime errors and zero broken page links. If errors exist, fix and re-output full HTML.
- When selected features imply backend (forms/newsletter/blog/quiz/booking/shop), implement frontend wiring and document backend/cloud activation steps in project.md.
- All CSS in <style>, all JS in <script>, mobile responsive
- CRITICAL JS RULES: Never use inline onclick="fn()" in HTML — use addEventListener in <script> instead. Always define ALL functions BEFORE any code that calls them. Place the entire <script> block at the end of <body>. Never split JS across multiple <script> tags.
- NEVER output raw JavaScript text outside <script> tags (especially after </footer> or before </body>).
- Use plain UTF-8 safe JavaScript tokens only (no hidden/control Unicode characters in script code).`

  let context = ''
  if (slimMd?.trim()) context += `\n\n---\nPROJECT BRIEF (follow 100%):\n${slimMd}`
  if (!htmlIsGeneric && currentHtml) {
    const snippet = currentHtml.length > MAX_CURRENT_HTML_CHARS ? currentHtml.slice(0, MAX_CURRENT_HTML_CHARS) + '\n<!-- truncated -->' : currentHtml
    context += `\n\n---\nCURRENT CODE (edit this, keep sections not mentioned):\n\`\`\`html\n${snippet}\n\`\`\``
  }
  return `${base}\n\n${capabilityBlock}${context}`
}

function getPlannerSystemPrompt(md?: string): string {
  const slimMd = slimProjectBrief(md)
  const capabilityBlock = getCapabilityPromptBlock()
  const base = `You are the official planning builder for AI Builder company. You must keep users inside AI Builder and never redirect them to other platforms.

Your job is to collect complete project requirements and produce a build-ready plan.

STEP 1 — Read the project brief provided. Build a checklist of what is already known vs missing:
- brand name
- target audience
- unique value proposition / what makes this business special
- page list (stages)
- key content blocks
- color preferences
- visual direction / style ambition / premium feel
- key features
- primary goal / conversion action (what should visitors do)
- proof assets (testimonials, logos, portfolio items)
- contact details (email/phone/location)
- backend needs (forms/newsletter/blog/quiz/booking/shop)
- hosting/cloud needs (custom domain, SMTP, DB, storage, webhooks)

STEP 2 — If information is missing: greet warmly, show “Pre-build checklist” with Known/Missing items, then ask ONLY about missing pieces.
Rules:
- Treat the Pre-Build Focus Checklist in project.md as canonical: ask ONLY items listed under “Missing (ask before build starts)”.
- NEVER ask about any item listed under “Known”.
- Ask as many short questions as needed to fill missing information.
- NEVER ask the same intent twice.
- NEVER ask about fields already present in the brief.
- Use simple language: website, page/stage, blocks, color scheme, design feel.
- Never use technical terms like HTML/CSS/JavaScript.
- Always offer quick answer options first (A/B/C style). User can pick one or type custom.
- For update requests, explicitly ask whether backend activation/hosting/cloud connection is needed.
- If the brief would likely produce a generic or ugly result, do NOT rush to PLAN_READY. Ask for the highest-impact missing detail first, especially around differentiation, design feel, trust/proof, and CTA.
- When the user's wording is rough or short, ask one clarifying question that helps turn it into stronger copy and design direction.

INTERACTIVE FORMAT (REQUIRED for every planner reply before PLAN_READY):
- Keep response short (max ~8 lines).
- Include one clear question, then exactly 3 options in this format:
  Question: [short question]
  A) [option]
  B) [option]
  C) [option]
  Type custom: [what they can type]
- Do not ask multiple unrelated questions in one reply.
- If multiple details are missing, ask the highest-priority one first and continue next turn.

STEP 2.5 — If all information is already present, still show a short “Pre-build checklist” summary first, then proceed to final plan output.

STEP 3 — If all information is present OR after the user answers your questions: output the plan block EXACTLY in this format (nothing after it):

PLAN_READY
Brand: [brand name]
Pages: [comma-separated list of pages]
Colors: [primary color, secondary color]
Style: [one short phrase e.g. Modern SaaS, Elegant Luxury, Friendly Local]
Features: [comma-separated list of key features]
BackendNeeded: [yes/no + list of required backend functions]
HostingCloud: [domain/email/db/storage/webhook needs]
ActivationPlan: [short list of activation steps inside AI Builder]
Summary: [one friendly sentence describing the website]

IMPORTANT: Output PLAN_READY only when you have all the information. Do not output code. Do not explain the plan in text — only output the PLAN_READY block.`

  if (slimMd && slimMd.trim()) {
    return `${base}\n\n${capabilityBlock}\n\n---\nPROJECT BRIEF (read this first, identify gaps):\n\n${slimMd}`
  }
  return `${base}\n\n${capabilityBlock}\n\n---\nNo project brief yet — ask the user what their business does and what kind of website they need.`
}

export function AIChat({ projectId, onCodeGenerated, onLoadingChange, onFilesUpdated, onValidateBuild, onRequestPreview, onRequestRollback, autoFixRetries = 0, projectFiles, projectImageData, initialMessage, initialMode = 'agent', initialBuildPrompt, isNewProject, settingsUpdated, onSettingsUpdateDismiss, fixPrompt, onFixPromptConsumed, selectedElementContext, onSelectionContextConsumed, previewSelectMode, onTogglePreviewSelectMode }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_BUILDER_MODEL)
  const [aiMode, setAiMode] = useState<AIMode>(initialMode)
  const [credits, setCredits] = useState<number | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [showBuildCard, setShowBuildCard] = useState(false)
  const [showSettingsCard, setShowSettingsCard] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [modelMenuPos, setModelMenuPos] = useState({ bottom: 0, left: 0 })
  const [modeMenuPos, setModeMenuPos] = useState({ bottom: 0, left: 0 })
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [attachMenuPos, setAttachMenuPos] = useState({ bottom: 0, left: 0 })
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false)
  // Attached context files — sent silently with the next message, shown as chips
  const [attachedFiles, setAttachedFiles] = useState<{name: string, content: string}[]>([])
  // Plan permission card — shown when project.md exists and chat is empty
  const [showPlanCard, setShowPlanCard] = useState(false)
  // Smart planner: parsed plan from PLAN_READY sentinel
  const [pendingPlan, setPendingPlan] = useState<{ brand: string; pages: string[]; colors: string; style: string; features: string[]; summary: string } | null>(null)
  const [plannerChecklist, setPlannerChecklist] = useState<PlannerChecklist | null>(null)
  const [lastRequestMetrics, setLastRequestMetrics] = useState<RequestMetrics | null>(null)
  const [buildRunStats, setBuildRunStats] = useState({ total: 0, success: 0 })
  const [lastBuildSummary, setLastBuildSummary] = useState<string[]>([])
  const [lastValidationIssues, setLastValidationIssues] = useState<string[]>([])
  const [styleLocks, setStyleLocks] = useState({ colors: false, fonts: false, layout: false })
  const [planRefinementInput, setPlanRefinementInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachBtnRef = useRef<HTMLButtonElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const modeMenuRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const modelBtnRef = useRef<HTMLButtonElement>(null)
  const modeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    if (!input.trim()) {
      textarea.style.height = '34px'
      textarea.style.overflowY = 'hidden'
      return
    }
    textarea.style.height = '0px'
    const nextHeight = Math.min(textarea.scrollHeight, MAX_INPUT_HEIGHT_PX)
    textarea.style.height = `${Math.max(34, nextHeight)}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_INPUT_HEIGHT_PX ? 'auto' : 'hidden'
  }, [input])

  // Load chat history from DB on mount (falls back to localStorage for demo)
  useEffect(() => {
    const load = async () => {
      if (projectId === 'demo') {
        // Demo mode: use localStorage only
        const saved = localStorage.getItem(`ai-chat-v5-demo`)
        if (saved) {
          try {
            const data = JSON.parse(saved)
            setMessages(data.messages || [])
            setAiMode(data.aiMode || initialMode)
            setHasInitialized(true)
          } catch {}
        }
        setHasInitialized(true)
        return
      }
      try {
        const res = await fetch(`/api/projects/${projectId}?excludeImages=1`)
        if (!res.ok) {
          setHasInitialized(true)
          return
        }
        const data = await res.json()
        if (data.chatHistory) {
          const parsed = JSON.parse(data.chatHistory)
          if (parsed.messages?.length > 0) {
            setMessages(parsed.messages)
            if (initialMode === 'planner') setAiMode('planner')
            else if (parsed.aiMode) setAiMode(parsed.aiMode)
            setHasInitialized(true)
          }
        }
      } catch {}
      setHasInitialized(true)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Save chat history to DB (debounced 1.5s), fallback localStorage for demo
  useEffect(() => {
    if (messages.length === 0) return
    if (projectId === 'demo') {
      localStorage.setItem(`ai-chat-v5-demo`, JSON.stringify({ messages, aiMode, ts: Date.now() }))
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: JSON.stringify({ messages, aiMode }) }),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
  }, [messages, aiMode, projectId])

  useEffect(() => {
    fetch('/api/user/credits').then(r => r.ok ? r.json() : null).then(d => d && setCredits(d.credits)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!projectId || projectId === 'demo') return
    const key = `planner-state-${projectId}`
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.pendingPlan) setPendingPlan(data.pendingPlan)
      if (data.plannerChecklist) setPlannerChecklist(data.plannerChecklist)
    } catch {}
  }, [projectId])

  useEffect(() => {
    if (!projectId || projectId === 'demo') return
    const key = `planner-state-${projectId}`
    localStorage.setItem(key, JSON.stringify({ pendingPlan, plannerChecklist }))
  }, [projectId, pendingPlan, plannerChecklist])

  useEffect(() => {
    if (aiMode === 'planner' && selectedModel.startsWith(DEEPSEEK_MODEL_PREFIX)) {
      setSelectedModel(DEFAULT_BUILDER_MODEL)
    }
  }, [aiMode, selectedModel])

  const sendMessage = async (messageText: string, opts?: { overrideMode?: AIMode; overrideMd?: string; internalPatchRetry?: number }) => {
    if (!messageText.trim() || isLoading) return

    // Snapshot and clear attached files before sending
    const contextFiles = attachedFiles
    setAttachedFiles([])

    setMessages(prev => [...prev, { role: 'user', content: messageText }])
    setInput('')
    setIsLoading(true)
    onLoadingChange?.(true)

    const effectiveMode = opts?.overrideMode ?? aiMode
    const requestStart = performance.now()
    let firstTokenAt: number | null = null
    let requestDoneMetrics: Partial<RequestMetrics> | null = null
    let resolvedModelValue = selectedModel
    // Preview stays visible during streaming — handleCodeGenerated triggers its own applying animation

    try {
      const selectedIsDeepSeek = selectedModel.startsWith(DEEPSEEK_MODEL_PREFIX)
      const buildIntent = effectiveMode === 'agent' && isBuildIntent(messageText)
      const forceBuilderModel = selectedIsDeepSeek && (effectiveMode === 'planner' || buildIntent)
      resolvedModelValue = forceBuilderModel ? DEFAULT_BUILDER_MODEL : selectedModel
      const [provider, model] = resolvedModelValue.split('|')
      const effectiveMd = opts?.overrideMd ?? projectFiles?.['project.md']
      const currentHtml = projectFiles?.['index.html']
      const systemPrompt = effectiveMode === 'planner'
        ? getPlannerSystemPrompt(effectiveMd)
        : getAgentSystemPrompt(currentHtml, effectiveMd)
      const maxTokens = effectiveMode === 'agent'
        ? (provider === 'anthropic'
            ? (model.includes('haiku') ? 4096 : 8000)
            : 12000)
        : 4000
      // Inject attached context files into the user message (silently — not shown in chat bubble)
      let contextSuffix = ''
      if (contextFiles.length > 0) {
        contextSuffix = '\n\n---\nATTACHED CONTEXT FILES — read these carefully and use them:\n' +
          contextFiles.map(f => `[${f.name}]\n\`\`\`\n${f.content.slice(0, 6000)}${f.content.length > 6000 ? '\n...[truncated]' : ''}\n\`\`\``).join('\n\n')
      }

      let userContent = effectiveMode === 'agent'
        ? `${messageText}${contextSuffix}\n\nREMEMBER: If this is a build/edit request output BOTH \`\`\`html and \`\`\`project.md blocks. If it's feedback/question reply conversationally.`
        : `${messageText}${contextSuffix}`

      if (effectiveMode === 'agent') {
        userContent += `\n\nSTRICT PIPELINE: 1) PLAN the exact page/section/backend changes from the brief. 2) BUILD complete HTML + project.md. 3) SELF-CHECK for runtime errors, broken navigation, and missing required sections; patch before final output.`
        userContent += buildStyleLockInstruction(styleLocks)

        if (selectedElementContext?.trim()) {
          userContent += `\n\nTARGET ELEMENT (user clicked this in preview): ${selectedElementContext.trim()}\nApply requested changes to this exact element/section first, while keeping other sections intact unless asked.`
          onSelectionContextConsumed?.()
        }
      }

      // Inject image references for agent builds
      if (effectiveMode === 'agent') {
        const mdAlreadyHasImages = (effectiveMd || '').includes('images/')
        if (mdAlreadyHasImages) {
          // project.md already lists image paths — just remind AI to use them
          userContent += `\n\nIMPORTANT: Use every image listed in the project brief with exact src paths. Do not skip any.`
        } else if (projectFiles) {
          // Build compact image list: page/section=path
          const imgParts: string[] = []
          for (const filename of Object.keys(projectFiles)) {
            if (!filename.startsWith('images/')) continue
            const base = filename.replace(/^images\//, '').replace(/\.[^.]+$/, '')
            imgParts.push(`${base}=${filename}`)
          }
          if (imgParts.length === 0 && projectImageData) {
            for (const [page, images] of Object.entries(projectImageData)) {
              for (const [slot, path] of Object.entries(images)) {
                if (path) imgParts.push(`${page}.${slot}=${path}`)
              }
            }
          }
          if (imgParts.length > 0) {
            userContent += `\n\nIMAGES (use all, exact src paths): ${imgParts.join(', ')}`
          }
        }
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), 360000) // 6 minutes

      const cappedHistory = compactHistory(messages)

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...cappedHistory.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userContent },
          ],
          provider,
          model,
          maxTokens,
        }),
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }))
        if (response.status === 402) throw new Error('Insufficient credits.')
        throw new Error(err.error || `Server error ${response.status}`)
      }

      // ── SSE streaming reader ────────────────────────────────────────────
      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ''
      let assistantContent = ''
      let rafPending = false

      const flushToUI = () => {
        rafPending = false
        // Strip complete <think>...</think> blocks, then any unclosed trailing <think>
        let display = assistantContent.replace(/<think>[\s\S]*?<\/think>/g, '')
        display = display.replace(/<think>[\s\S]*$/, '').trim()
        // Agent mode: once AI starts emitting code, hide raw HTML — show friendly progress indicator
        if (effectiveMode === 'agent') {
          const codeIdx = display.indexOf('```html')
          if (codeIdx !== -1) {
            const textBefore = display.substring(0, codeIdx).trim()
            display = textBefore ? `${textBefore}\n\n🏗️ Building your website...` : '🏗️ Building your website...'
          }
        }
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.streaming) updated[updated.length - 1] = { ...last, content: display }
          return updated
        })
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          sseBuffer += decoder.decode(value, { stream: true })
          const lines = sseBuffer.split('\n')
          sseBuffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt.delta) {
                assistantContent += evt.delta
                if (firstTokenAt === null) firstTokenAt = performance.now()
                if (!rafPending) { rafPending = true; requestAnimationFrame(flushToUI) }
              }
              if (evt.done) {
                if (evt.remainingCredits !== undefined) setCredits(evt.remainingCredits)
                requestDoneMetrics = {
                  inputTokens: evt.inputTokens,
                  outputTokens: evt.outputTokens,
                  cost: evt.cost,
                  creditsUsed: evt.creditsUsed,
                }
              }
              if (evt.error) throw new Error(evt.error)
            } catch (parseErr: unknown) {
              // SyntaxError = bad/partial JSON line from SSE chunk boundary → skip silently
              // Any other error type (e.g. from evt.error throw above) → re-throw
              if (!(parseErr instanceof SyntaxError)) throw parseErr
            }
          }
        }
      } catch (streamErr: unknown) {
        if (isAbortError(streamErr)) throw streamErr // re-throw to outer catch
        // Real network error mid-stream — preserve partial content
        assistantContent += '\n\n⚠️ Connection lost — partial response above.'
      } finally {
        abortControllerRef.current = null
      }

      // ── Finalize: strip think blocks, extract code blocks ───────────────
      let finalDisplay = assistantContent.replace(/<think>[\s\S]*?<\/think>/g, '')
      finalDisplay = finalDisplay.replace(/<think>[\s\S]*$/, '').trim()

      let displayMessage = finalDisplay

      if (effectiveMode === 'agent' && onCodeGenerated && assistantContent.includes('```html')) {
        const htmlIdx = assistantContent.indexOf('```html')
        const htmlStart = htmlIdx + 7
        const htmlEnd = assistantContent.indexOf('```', htmlStart)
        const code = htmlEnd !== -1 ? assistantContent.substring(htmlStart, htmlEnd).trim() : ''

        if (code.length > 100) {
          const previousHtml = projectFiles?.['index.html'] || ''
          const summary = createChangeSummary(previousHtml, code)
          setLastBuildSummary(summary)
          setLastValidationIssues([])
          onCodeGenerated(code)

          // Extract project.md block from raw stream content
          const mdIdx = assistantContent.indexOf('```project.md')
          if (mdIdx !== -1) {
            const mdStart = mdIdx + 13
            const mdEnd = assistantContent.indexOf('```', mdStart)
            if (mdEnd !== -1) {
              const updatedMd = assistantContent.substring(mdStart, mdEnd).trim()
              if (updatedMd.length > 10) onFilesUpdated?.({ 'project.md': updatedMd })
            }
          }

          // Human-readable note before the code block (use stripped display)
          const dispHtmlIdx = finalDisplay.indexOf('```html')
          const beforeHtml = dispHtmlIdx > 0 ? finalDisplay.substring(0, dispHtmlIdx).trim() : ''
          displayMessage = beforeHtml.length > 10 && beforeHtml.length < 300
            ? `✅ Website updated! ${beforeHtml}`
            : '✅ Website updated!'

          if (onValidateBuild) {
            const validation = await onValidateBuild()
            setBuildRunStats((previous) => ({
              total: previous.total + 1,
              success: previous.success + (validation.ok ? 1 : 0),
            }))

            if (!validation.ok) {
              setLastValidationIssues(validation.issues)
              const patchRetry = opts?.internalPatchRetry ?? 0
              if (patchRetry < 2) {
                const issueList = validation.issues.slice(0, 6).join('\n- ')
                setTimeout(() => {
                  sendMessage(
                    `[AUTO PATCH] Fix these validation issues and regenerate complete website:\n- ${issueList}`,
                    { overrideMode: 'agent', overrideMd: effectiveMd, internalPatchRetry: patchRetry + 1 }
                  )
                }, 120)
                displayMessage = `⚠️ Validation found issues. Auto-patching now (${patchRetry + 1}/2)...`
              } else {
                displayMessage = `⚠️ Validation issues remain after auto-patch attempts:\n- ${validation.issues.slice(0, 6).join('\n- ')}`
              }
            }
          }
        } else {
          // AI said ```html but content too short — show text
          displayMessage = finalDisplay.replace(/```[\s\S]*?```/g, '').trim() || finalDisplay
        }
      }

      // Planner mode: detect PLAN_READY sentinel and parse into plan card
      if (effectiveMode === 'planner' && assistantContent.includes('PLAN_READY')) {
        const planIdx = finalDisplay.indexOf('PLAN_READY')
        const planBlock = assistantContent.slice(assistantContent.indexOf('PLAN_READY'))
        const parse = (key: string) => planBlock.match(new RegExp(`^${key}:\\s*(.+)`, 'm'))?.[1]?.trim() ?? ''
        const parsed = {
          brand: parse('Brand'),
          pages: parse('Pages').split(',').map((s: string) => s.trim()).filter(Boolean),
          colors: parse('Colors'),
          style: parse('Style'),
          features: parse('Features').split(',').map((s: string) => s.trim()).filter(Boolean),
          summary: parse('Summary'),
        }
        if (parsed.brand || parsed.summary) {
          setPendingPlan(parsed)
          const beforePlan = planIdx > 0 ? finalDisplay.substring(0, planIdx).trim() : ''
          displayMessage = beforePlan || "I've got everything I need! Here's your website plan:"
        }
      }

      if (effectiveMode === 'planner') {
        const parsedChecklist = parsePlannerChecklist(finalDisplay)
        if (parsedChecklist) setPlannerChecklist(parsedChecklist)
        displayMessage = ensureInteractivePlannerReply(displayMessage, parsedChecklist ?? plannerChecklist)
      }

      const [usedProvider, usedModel] = resolvedModelValue.split('|')
      setLastRequestMetrics({
        mode: effectiveMode,
        provider: usedProvider,
        model: usedModel,
        latencyMs: Math.max(1, Math.round(performance.now() - requestStart)),
        ttftMs: firstTokenAt ? Math.max(1, Math.round(firstTokenAt - requestStart)) : undefined,
        inputTokens: requestDoneMetrics?.inputTokens,
        outputTokens: requestDoneMetrics?.outputTokens,
        cost: requestDoneMetrics?.cost,
        creditsUsed: requestDoneMetrics?.creditsUsed,
        patchRetries: opts?.internalPatchRetry ?? 0,
        autoFixRetries,
        success: !displayMessage.startsWith('⚠️') && !displayMessage.startsWith('❌'),
      })

      // Replace the streaming placeholder with the final message (no streaming flag)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: displayMessage }
        return updated
      })
    } catch (error: unknown) {
      if (isAbortError(error)) {
        // User clicked Stop — neutral message, not an error
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.streaming) updated[updated.length - 1] = { role: 'assistant', content: '✋ Cancelled.' }
          else updated.push({ role: 'assistant', content: '✋ Cancelled.' })
          return updated
        })
        const [usedProvider, usedModel] = resolvedModelValue.split('|')
        setLastRequestMetrics({
          mode: effectiveMode,
          provider: usedProvider,
          model: usedModel,
          latencyMs: Math.max(1, Math.round(performance.now() - requestStart)),
          patchRetries: opts?.internalPatchRetry ?? 0,
          autoFixRetries,
          success: false,
        })
      } else {
        let msg = 'Failed to get AI response'
        const errorMessage = getErrorMessage(error)
        if (errorMessage === 'Failed to fetch') msg = '🌐 Network error. Check your connection.'
        else if (errorMessage) msg = errorMessage
        // Replace in-progress streaming bubble if present, otherwise append
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.streaming) {
            updated[updated.length - 1] = { role: 'assistant', content: `❌ ${msg}` }
          } else {
            updated.push({ role: 'assistant', content: `❌ ${msg}` })
          }
          return updated
        })
        const [usedProvider, usedModel] = resolvedModelValue.split('|')
        setLastRequestMetrics({
          mode: effectiveMode,
          provider: usedProvider,
          model: usedModel,
          latencyMs: Math.max(1, Math.round(performance.now() - requestStart)),
          patchRetries: opts?.internalPatchRetry ?? 0,
          autoFixRetries,
          success: false,
        })
      }
    } finally {
      abortControllerRef.current = null
      setIsLoading(false)
      onLoadingChange?.(false)
    }
  }

  useEffect(() => {
    // Legacy: auto-send initialMessage if explicitly provided (kept for any callers still using it)
    const firedKey = `ai-init-fired-${projectId}`
    const alreadyFired = localStorage.getItem(firedKey) === '1'
    if (initialMessage && !hasInitialized && messages.length === 0 && !isLoading && !alreadyFired) {
      localStorage.setItem(firedKey, '1')
      setHasInitialized(true)
      setTimeout(() => sendMessage(initialMessage), 800)
    } else if (messages.length > 0 || alreadyFired) {
      setHasInitialized(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, hasInitialized, messages.length])

  // Auto-send fixPrompt when provided (error auto-fix loop from parent)
  useEffect(() => {
    if (fixPrompt && !isLoading) {
      onFixPromptConsumed?.()
      sendMessage(fixPrompt, { overrideMode: 'agent' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixPrompt])

  // Show "Build my website" card for new/generic projects (no auto-send)
  useEffect(() => {
    if (isNewProject && messages.length === 0 && !isLoading) {
      setShowBuildCard(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewProject])

  // Show plan permission card when project.md exists and agent has no messages yet
  useEffect(() => {
    if (
    aiMode === 'agent' &&
      messages.length === 0 &&
      !isNewProject &&
      !showBuildCard &&
      projectFiles?.['project.md'] &&
      projectFiles['project.md'].trim().length > 20
    ) {
      setShowPlanCard(true)
    } else {
      setShowPlanCard(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMode, messages.length, projectFiles?.['project.md']])

  // Show "Settings updated" card when returning from wizard
  useEffect(() => {
    if (settingsUpdated) {
      setShowSettingsCard(true)
    }
  }, [settingsUpdated])

  // Planner mode: AI speaks first — auto-send opener when planner is empty and project.md exists
  useEffect(() => {
    if (
      aiMode === 'planner' &&
      messages.length === 0 &&
      !isLoading &&
      hasInitialized &&
      projectFiles?.['project.md']?.trim()
    ) {
      const t = setTimeout(() => {
        sendMessage('[SYSTEM] Read the project brief and start the planning session. Greet the user, identify missing information, provide quick answer options, and ask only about the gaps. If all info is present, output PLAN_READY immediately.', { overrideMode: 'planner' })
      }, 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMode, hasInitialized, messages.length])

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type === 'application/pdf') {
      setAttachedFiles(prev => [...prev, { name: file.name, content: '[PDF — binary content not readable as text]' }])
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        setAttachedFiles(prev => [...prev, { name: file.name, content: text }])
      }
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  const availableModels = aiMode === 'planner'
    ? AI_MODELS.filter((modelOption) => !modelOption.value.startsWith(DEEPSEEK_MODEL_PREFIX))
    : AI_MODELS
  const currentModelData = AI_MODELS.find(m => m.value === selectedModel) || AI_MODELS[0]

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !showBuildCard && !showSettingsCard && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Sparkles className="w-10 h-10 text-purple-500/50 mb-3" />
            <p className="text-sm font-medium text-slate-300">AI Website Builder</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              {aiMode === 'agent' && "Describe your website and I'll build it"}
              {aiMode === 'planner' && (projectFiles?.['project.md']?.trim() ? 'Reading your project brief...' : 'Tell me about your project')}
            </p>
          </div>
        )}

        {/* "Build my website" card — shown for new/generic projects */}
        {showBuildCard && !isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[90%] bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <span className="text-base">🚀</span>
                <span>Your project is ready to build!</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                I&apos;ve reviewed your project settings. Click the button below and I&apos;ll build your complete website right now.
              </p>
              <button
                onClick={() => {
                  setShowBuildCard(false)
                  const prompt = initialBuildPrompt || 'Build my complete website based on all the project settings and requirements.'
                  sendMessage(prompt)
                }}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors w-full"
              >
                🏗️ Build my website
              </button>
              <button
                onClick={() => setShowBuildCard(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-center"
              >
                I&apos;ll describe it myself
              </button>
            </div>
          </div>
        )}

        {/* Plan permission card — shown when project.md exists and no messages yet */}
        {showPlanCard && !isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[92%] bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <span className="text-base">📋</span>
                <span>Project plan ready</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                I’ve read your project brief. Shall I build the website now based on this plan?
              </p>
              <div className="bg-[#111]/60 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed font-mono">
                  {(projectFiles?.['project.md'] ?? '').slice(0, 600)}{(projectFiles?.['project.md']?.length ?? 0) > 600 ? '\n...' : ''}
                </pre>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPlanCard(false)
                    sendMessage('Build the complete website now based on the project plan.', { overrideMode: 'agent' })
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                >
                  🚀 Yes, start building
                </button>
                <button
                  onClick={() => setShowPlanCard(false)}
                  className="flex-1 px-3 py-2 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  I’ll give more details
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-br-sm'
                : 'bg-[#1e1e1e] text-slate-200 rounded-bl-sm border border-white/5'
            }`}>
              <div className="whitespace-pre-wrap break-words">
                {msg.content}
                {msg.streaming && msg.content.length > 0 && (
                  <span className="inline-block w-1.5 h-3.5 bg-slate-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                )}
              </div>
              {aiMode === 'planner' && msg.role === 'assistant' && !msg.streaming && (
                (() => {
                  const quickOptions = extractPlannerQuickOptions(msg.content)
                  if (quickOptions.length === 0) return null
                  return (
                    <div className="mt-2 flex gap-1 overflow-x-auto whitespace-nowrap pb-0.5">
                      {quickOptions.map((optionText) => (
                        <button
                          key={optionText}
                          type="button"
                          onClick={() => sendMessage(optionText, { overrideMode: 'planner' })}
                          className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border border-blue-400/30 text-blue-200 hover:text-white hover:bg-blue-500/20 transition-colors"
                        >
                          {optionText}
                        </button>
                      ))}
                    </div>
                  )
                })()
              )}
              {msg.streaming && (
                <button
                  onClick={() => abortControllerRef.current?.abort()}
                  className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                >
                  <span className="inline-block w-2 h-2 bg-current rounded-sm shrink-0" />
                  Stop generating
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && !messages.some(m => m.streaming) && (
          <div className="flex justify-start">
            <div className="bg-[#1e1e1e] border border-white/5 px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          </div>
        )}

        {/* "Settings updated" card — shown when returning from the wizard */}
        {showSettingsCard && !isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[90%] bg-gradient-to-br from-blue-900/40 to-teal-900/40 border border-blue-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <span className="text-base">🔄</span>
                <span>Project settings updated!</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your project settings were just updated in the wizard. Would you like me to rebuild the website with the new settings?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSettingsCard(false)
                    onSettingsUpdateDismiss?.()
                    const prompt = initialBuildPrompt || 'Rebuild my complete website using the updated project settings and requirements.'
                    sendMessage(prompt)
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Yes, rebuild
                </button>
                <button
                  onClick={() => {
                    setShowSettingsCard(false)
                    onSettingsUpdateDismiss?.()
                  }}
                  className="flex-1 px-3 py-2 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Plan Card — appears after planner outputs PLAN_READY */}
        {pendingPlan && !isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[95%] bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <span className="text-base">📋</span>
                <span>Your Website Plan</span>
              </div>

              {/* Brand + Style */}
              <div className="flex flex-wrap gap-2 items-center">
                {pendingPlan.brand && (
                  <span className="text-xs font-semibold text-white bg-purple-600/60 px-2.5 py-1 rounded-full">{pendingPlan.brand}</span>
                )}
                {pendingPlan.style && (
                  <span className="text-xs text-blue-300 bg-blue-500/20 px-2.5 py-1 rounded-full">{pendingPlan.style}</span>
                )}
                {pendingPlan.colors && (
                  <span className="text-xs text-slate-300 bg-white/8 px-2.5 py-1 rounded-full">🎨 {pendingPlan.colors}</span>
                )}
              </div>

              {/* Pages */}
              {pendingPlan.pages.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Pages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingPlan.pages.map((p, i) => (
                      <span key={i} className="text-[11px] text-slate-300 bg-white/8 border border-white/10 px-2 py-0.5 rounded-md">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {pendingPlan.features.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Features</p>
                  <ul className="space-y-0.5">
                    {pendingPlan.features.map((f, i) => (
                      <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5"><span className="text-blue-400 shrink-0 mt-0.5">·</span>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary */}
              {pendingPlan.summary && (
                <p className="text-xs text-slate-400 italic border-t border-white/8 pt-2">{pendingPlan.summary}</p>
              )}

              {plannerChecklist && (
                <div className="border-t border-white/8 pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pre-build checklist</p>
                    <span className="text-[11px] text-blue-300">{plannerChecklist.progress}% complete</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${plannerChecklist.progress}%` }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-white/5 border border-white/8 rounded-lg p-2">
                      <p className="text-[10px] text-green-300 uppercase tracking-wide mb-1">Known</p>
                      {plannerChecklist.known.length > 0 ? (
                        <ul className="space-y-0.5">
                          {plannerChecklist.known.slice(0, 6).map((item, index) => (
                            <li key={index} className="text-[11px] text-slate-300">• {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500">No confirmed items yet</p>
                      )}
                    </div>
                    <div className="bg-white/5 border border-white/8 rounded-lg p-2">
                      <p className="text-[10px] text-amber-300 uppercase tracking-wide mb-1">Missing</p>
                      {plannerChecklist.missing.length > 0 ? (
                        <ul className="space-y-0.5">
                          {plannerChecklist.missing.slice(0, 6).map((item, index) => (
                            <li key={index} className="text-[11px] text-slate-300">• {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500">No critical gaps detected</p>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const groupedMissing = groupMissingChecklist(plannerChecklist.missing)
                    const whyText: Record<ChecklistGroup, string> = {
                      business: 'Why this question? It aligns messaging and conversion goals.',
                      pages: 'Why this question? It prevents missing or duplicated page structure.',
                      assets: 'Why this question? It ensures the design uses real proof/content assets.',
                      backend: 'Why this question? It defines which features need server activation.',
                      hosting: 'Why this question? It avoids deployment blockers later.',
                      other: 'Why this question? It closes planning gaps before build starts.',
                    }
                    const order: ChecklistGroup[] = ['business', 'pages', 'assets', 'backend', 'hosting', 'other']
                    const labels: Record<ChecklistGroup, string> = {
                      business: 'Business',
                      pages: 'Pages',
                      assets: 'Assets',
                      backend: 'Backend',
                      hosting: 'Hosting',
                      other: 'Other',
                    }
                    const activeGroups = order.filter((group) => groupedMissing[group].length > 0)
                    if (activeGroups.length === 0) return null
                    return (
                      <div className="space-y-1.5">
                        {activeGroups.map((group) => (
                          <div key={group} className="bg-white/5 border border-white/8 rounded-lg p-2">
                            <p className="text-[10px] text-blue-300 uppercase tracking-wide">{labels[group]}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{whyText[group]}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Inline refinement input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={planRefinementInput}
                  onChange={e => setPlanRefinementInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && planRefinementInput.trim()) {
                      const txt = planRefinementInput.trim()
                      setPlanRefinementInput('')
                      sendMessage(`Update the plan: ${txt}`, { overrideMode: 'planner' })
                    }
                  }}
                  placeholder="Change something in the plan..."
                  className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={() => {
                    if (planRefinementInput.trim()) {
                      const txt = planRefinementInput.trim()
                      setPlanRefinementInput('')
                      sendMessage(`Update the plan: ${txt}`, { overrideMode: 'planner' })
                    }
                  }}
                  className="text-xs px-2.5 py-1.5 bg-white/8 hover:bg-white/15 text-slate-300 rounded-lg transition-colors"
                >
                  Update
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Build overrideMd from plan fields
                    const planMd = `# Project Brief: ${pendingPlan.brand}\n\n**Brand Name:** ${pendingPlan.brand}\n**Pages:** ${pendingPlan.pages.join(', ')}\n**Colors:** ${pendingPlan.colors}\n**Style:** ${pendingPlan.style}\n**Features:** ${pendingPlan.features.join(', ')}\n\n## Summary\n${pendingPlan.summary}\n`
                    const existingMd = projectFiles?.['project.md'] ?? ''
                    const updatedMd = existingMd.trim() ? existingMd + '\n\n## Planner Output\n' + planMd : planMd
                    setPendingPlan(null)
                    setAiMode('agent')
                    onFilesUpdated?.({ 'project.md': updatedMd })
                    sendMessage('Build the complete website now based on the plan we just created.', { overrideMode: 'agent', overrideMd: updatedMd })
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all"
                >
                  🚀 Build my website
                </button>
                <button
                  onClick={() => {
                    setPendingPlan(null)
                    setPlanRefinementInput('')
                    setMessages([])
                  }}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  ↩ Start over
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {lastRequestMetrics && (
        <div className="px-4 pb-1">
          <div className="text-[11px] text-slate-500 border border-white/8 bg-[#141414] rounded-lg px-2.5 py-1.5 flex flex-wrap gap-x-3 gap-y-1">
            <span>⏱ {lastRequestMetrics.latencyMs}ms</span>
            {lastRequestMetrics.ttftMs !== undefined && <span>⚡ ttft {lastRequestMetrics.ttftMs}ms</span>}
            <span>🧠 {lastRequestMetrics.provider}/{lastRequestMetrics.model}</span>
            {lastRequestMetrics.inputTokens !== undefined && (
              <span>in {lastRequestMetrics.inputTokens}</span>
            )}
            {lastRequestMetrics.outputTokens !== undefined && (
              <span>out {lastRequestMetrics.outputTokens}</span>
            )}
            {lastRequestMetrics.creditsUsed !== undefined && (
              <span>credits -{lastRequestMetrics.creditsUsed}</span>
            )}
            {lastRequestMetrics.cost !== undefined && (
              <span>${lastRequestMetrics.cost.toFixed(4)}</span>
            )}
            {lastRequestMetrics.patchRetries !== undefined && lastRequestMetrics.patchRetries > 0 && (
              <span>patch retries {lastRequestMetrics.patchRetries}</span>
            )}
            {lastRequestMetrics.autoFixRetries !== undefined && lastRequestMetrics.autoFixRetries > 0 && (
              <span>auto-fix retries {lastRequestMetrics.autoFixRetries}</span>
            )}
            {lastRequestMetrics.success !== undefined && (
              <span>{lastRequestMetrics.success ? '✅ success' : '⚠️ needs fix'}</span>
            )}
            {buildRunStats.total > 0 && (
              <span>final success rate {Math.round((buildRunStats.success / buildRunStats.total) * 100)}%</span>
            )}
          </div>
        </div>
      )}

      {aiMode === 'agent' && (lastBuildSummary.length > 0 || lastValidationIssues.length > 0) && !isLoading && (
        <div className="px-4 pb-2">
          <div className="border border-white/10 bg-[#141414] rounded-xl p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-300 font-medium">What changed</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onRequestPreview?.()}
                  className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => onRequestPreview?.()}
                  className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => onRequestRollback?.()}
                  className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Rollback
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage('Try an alternative implementation while preserving current requirements.', { overrideMode: 'agent' })}
                  className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Try alternative
                </button>
              </div>
            </div>
            {lastBuildSummary.length > 0 && (
              <ul className="space-y-0.5">
                {lastBuildSummary.map((item, index) => (
                  <li key={index} className="text-[11px] text-slate-400">• {item}</li>
                ))}
              </ul>
            )}
            {lastValidationIssues.length > 0 && (
              <div className="border-t border-white/8 pt-2">
                <p className="text-[10px] text-amber-300 uppercase tracking-wide mb-1">Validation issues</p>
                <ul className="space-y-0.5">
                  {lastValidationIssues.slice(0, 5).map((item, index) => (
                    <li key={index} className="text-[11px] text-slate-400">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transparent backdrops to close dropdowns */}
      {showModeMenu    && <div className="fixed inset-0 z-[9998]" onClick={() => setShowModeMenu(false)} />}
      {showModelMenu   && <div className="fixed inset-0 z-[9998]" onClick={() => setShowModelMenu(false)} />}
      {showAttachMenu  && <div className="fixed inset-0 z-[9998]" onClick={() => setShowAttachMenu(false)} />}

      {/* Workspace file picker overlay */}
      {showWorkspacePicker && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl w-80 max-h-96 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-sm font-medium text-white">Attach from workspace</span>
              <button onClick={() => setShowWorkspacePicker(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {(() => {
                const textFiles = projectFiles
                  ? Object.entries(projectFiles).filter(([k]) => !k.startsWith('images/'))
                  : []
                return textFiles.length > 0 ? (
                  textFiles.map(([filename, content]) => (
                    <button
                      key={filename}
                      onClick={() => {
                        // Add as chip context — not pasted into textarea
                        const alreadyAttached = attachedFiles.some(f => f.name === filename)
                        if (!alreadyAttached) {
                          setAttachedFiles(prev => [...prev, { name: filename, content }])
                        }
                        setShowWorkspacePicker(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors group"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
                      <span className="text-xs text-slate-300 group-hover:text-white truncate">{filename}</span>
                      <span className="ml-auto text-[10px] text-slate-600 shrink-0">
                        {(content.length / 1024).toFixed(1)}k
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center">
                    <p className="text-slate-500 text-xs">No project files yet.</p>
                    <p className="text-slate-600 text-[11px] mt-1">Build your website first, then attach the code as context.</p>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls — VS Code Copilot style unified box */}
      <div className="border-t border-white/8 bg-[#111] p-3">
        <div className="rounded-xl border border-white/10 bg-[#1a1a1a] relative">

          {/* Top bar: attach context */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            {/* Attach button with dropdown */}
            <div className="relative">
              <button
                ref={attachBtnRef}
                onClick={() => {
                  if (!showAttachMenu && attachBtnRef.current) {
                    const r = attachBtnRef.current.getBoundingClientRect()
                    setAttachMenuPos({ bottom: window.innerHeight - r.top + 6, left: r.left })
                  }
                  setShowAttachMenu(v => !v)
                }}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  showAttachMenu ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Attach context"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Add Context...</span>
              </button>

              {showAttachMenu && (
                <div
                  className="fixed w-52 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[9999]"
                  style={{ bottom: attachMenuPos.bottom, left: attachMenuPos.left }}
                >
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setShowAttachMenu(false)
                        setShowWorkspacePicker(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium leading-tight">From workspace</div>
                        <div className="text-[10px] text-slate-600 leading-tight">Pick a project file</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowAttachMenu(false)
                        fileInputRef.current?.click()
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium leading-tight">From local machine</div>
                        <div className="text-[10px] text-slate-600 leading-tight">Upload a file</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.html,.css,.js,.ts,.json" className="hidden" onChange={handleFileAttach} />
            {credits !== null && (
              <span className="text-[11px] text-slate-600">{credits.toLocaleString()} cr</span>
            )}
          </div>

          {/* Attached file chips */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] px-2 py-0.5 rounded-full">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button
                    onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                    className="ml-0.5 text-blue-400 hover:text-white transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedElementContext?.trim() && (
            <div className="px-3 pt-2">
              <div className="inline-flex max-w-full items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] px-2 py-0.5 rounded-full">
                <span className="truncate max-w-[280px]">Selected target: {selectedElementContext.trim()}</span>
                <button
                  onClick={() => onSelectionContextConsumed?.()}
                  className="text-emerald-400 hover:text-white transition-colors"
                  title="Clear selected target"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          {/* Textarea */}
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            rows={1}
            placeholder={
              aiMode === 'agent' ? "Describe what to build next..." :
              'Tell me about your project...'
            }
            className={`w-full ${input.trim() ? 'min-h-[40px] max-h-[104px]' : '!h-[40px] !min-h-[40px] !max-h-[40px]'} bg-transparent border-0 border-none shadow-none focus-visible:ring-0 text-white placeholder:text-slate-600 text-sm leading-5 resize-none px-3 py-2`}
            disabled={isLoading}
          />

          {aiMode === 'planner' && (
            <div className="px-2.5 pb-1.5">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-md border border-white/10 bg-black/60 px-2 py-1.5">
                {(() => {
                  const base = ['Use existing brief and continue']
                  const grouped = plannerChecklist ? groupMissingChecklist(plannerChecklist.missing) : null
                  const dynamicPrompts: string[] = []
                  if (grouped?.business.length) dynamicPrompts.push('Let’s finish business goals and audience')
                  if (grouped?.pages.length) dynamicPrompts.push('Let’s finalize pages and section structure')
                  if (grouped?.assets.length) dynamicPrompts.push('Let’s define content/assets still missing')
                  if (grouped?.backend.length) dynamicPrompts.push('I need backend features (forms/newsletter/blog)')
                  if (grouped?.hosting.length) dynamicPrompts.push('Need hosting/domain/cloud setup guidance')
                  const prompts = [...base, ...dynamicPrompts].slice(0, 6)
                  return prompts.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => sendMessage(quick, { overrideMode: 'planner' })}
                    className="shrink-0 text-[10px] px-2.5 py-1 rounded-md border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {quick}
                  </button>
                  ))
                })()}
              </div>
            </div>
          )}

          {aiMode === 'agent' && (
            <div className="px-2.5 pb-1.5">
              <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-black/95 px-2 py-2 [scrollbar-color:#3f3f46_#000] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setStyleLocks((previous) => ({ ...previous, colors: !previous.colors }))}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors ${styleLocks.colors ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-900'}`}
                  >
                    Lock colors
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleLocks((previous) => ({ ...previous, fonts: !previous.fonts }))}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors ${styleLocks.fonts ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-900'}`}
                  >
                    Lock fonts
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleLocks((previous) => ({ ...previous, layout: !previous.layout }))}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors ${styleLocks.layout ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-900'}`}
                  >
                    Lock layout
                  </button>
                  {[
                    'Try an alternative visual style while keeping the same structure.',
                    'Refine layout spacing and section hierarchy for better readability.',
                    'Keep style and structure, but improve the copy and CTA clarity.',
                  ].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => sendMessage(quick, { overrideMode: 'agent' })}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-2 pb-2 pt-1 gap-2">
            <div className="flex items-center gap-1.5">

              {/* ── Mode dropdown ── */}
              <div className="relative" ref={modeMenuRef}>
                <button
                  ref={modeBtnRef}
                  onClick={() => {
                    setShowModelMenu(false)
                    if (!showModeMenu && modeBtnRef.current) {
                      const r = modeBtnRef.current.getBoundingClientRect()
                      setModeMenuPos({ bottom: window.innerHeight - r.top + 6, left: r.left })
                    }
                    setShowModeMenu(v => !v)
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors border
                    ${showModeMenu ? 'border-white/20 bg-white/8 text-white' : 'border-white/8 text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  {aiMode === 'agent'   && <Bot className="w-3.5 h-3.5 text-purple-400" />}
                  {aiMode === 'planner' && <Cpu className="w-3.5 h-3.5 text-blue-400" />}
                  <span className="font-medium capitalize">{aiMode}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showModeMenu ? 'rotate-180' : ''}`} />
                </button>

                {showModeMenu && (
                  <div
                    className="fixed w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[9999]"
                    style={{ bottom: modeMenuPos.bottom, left: modeMenuPos.left }}
                  >
                    <div className="p-1.5">
                      {[
                        { value: 'agent'   as AIMode, icon: <Bot className="w-3.5 h-3.5 text-purple-400" />,          label: 'Agent',   desc: 'Builds complete websites' },
                        { value: 'planner' as AIMode, icon: <Cpu className="w-3.5 h-3.5 text-blue-400" />,           label: 'Planner', desc: 'Plans before building' },
                      ].map(m => (
                        <button
                          key={m.value}
                          onClick={() => { setAiMode(m.value); setShowModeMenu(false) }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors
                            ${aiMode === m.value ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          {m.icon}
                          <div className="flex-1">
                            <div className="text-xs font-medium leading-tight">{m.label}</div>
                            <div className="text-[10px] text-slate-600 leading-tight">{m.desc}</div>
                          </div>
                          {aiMode === m.value && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Model dropdown ── */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  ref={modelBtnRef}
                  onClick={() => {
                    setShowModeMenu(false)
                    if (!showModelMenu && modelBtnRef.current) {
                      const r = modelBtnRef.current.getBoundingClientRect()
                      setModelMenuPos({ bottom: window.innerHeight - r.top + 6, left: r.left })
                    }
                    setShowModelMenu(v => !v)
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors border
                    ${showModelMenu ? 'border-white/20 bg-white/8 text-white' : 'border-white/8 text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Sparkles className="w-3 h-3 text-slate-500" />
                  <span className="max-w-[80px] truncate">{currentModelData.label.replace(' Coder','').replace(' Turbo','')}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
                </button>

                {showModelMenu && (
                  <div
                    className="fixed w-52 bg-[#252525] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden"
                    style={{ bottom: modelMenuPos.bottom, left: modelMenuPos.left, maxHeight: '360px', overflowY: 'auto' }}
                  >
                    <div className="p-1.5">
                      {availableModels.map(m => (
                        <button
                          key={m.value}
                          onClick={() => { setSelectedModel(m.value); setShowModelMenu(false) }}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors
                            ${selectedModel === m.value ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          <span className="text-xs truncate">{m.label}</span>
                          <span className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded
                            ${m.credits === 'x1' ? 'bg-green-500/20 text-green-400' : m.credits === 'x2' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {m.credits}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onTogglePreviewSelectMode?.()}
                className={`h-7 w-8 p-0 border ${previewSelectMode ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20' : 'border-white/8 text-slate-400 hover:text-white hover:bg-white/5'}`}
                title="Select element in preview"
              >
                <LocateFixed className="w-3.5 h-3.5" />
              </Button>

            </div>

            {/* Right: send button */}
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="shrink-0 w-8 h-8 p-0 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-lg"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default AIChat
