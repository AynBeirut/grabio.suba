'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2, Send, Sparkles, X } from 'lucide-react'

const hiddenOnRoutes = [/^\/auth(\/|$)/]
const ASSISTANT_OPEN_KEY = 'aibuilder:floating-guide:open'
const ASSISTANT_MESSAGES_KEY = 'aibuilder:floating-guide:messages'
const MAX_PERSISTED_MESSAGES = 30

interface GuideMessage {
  role: 'user' | 'assistant'
  content: string
  kind?: 'chat' | 'system'
  createdAt?: number
}

function toSafeGuideMessages(value: unknown): GuideMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is GuideMessage => {
      if (!item || typeof item !== 'object') return false
      const role = (item as GuideMessage).role
      const content = (item as GuideMessage).content
      const kind = (item as GuideMessage).kind
      const createdAt = (item as GuideMessage).createdAt
      const validKind = kind === undefined || kind === 'chat' || kind === 'system'
      const validCreatedAt = createdAt === undefined || typeof createdAt === 'number'
      return (role === 'user' || role === 'assistant') && typeof content === 'string' && validKind && validCreatedAt
    })
    .slice(-MAX_PERSISTED_MESSAGES)
}

function formatTime(ts?: number): string {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatRelativeTime(ts?: number): string {
  if (!ts) return ''
  const deltaMs = Date.now() - ts
  const deltaSec = Math.max(0, Math.floor(deltaMs / 1000))

  if (deltaSec < 60) return 'just now'
  const deltaMin = Math.floor(deltaSec / 60)
  if (deltaMin < 60) return `${deltaMin}m ago`
  const deltaHours = Math.floor(deltaMin / 60)
  if (deltaHours < 24) return `${deltaHours}h ago`
  const deltaDays = Math.floor(deltaHours / 24)
  return `${deltaDays}d ago`
}

export function FloatingGuideAssistant() {
  const pathname = usePathname()
  const previousScopeRef = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<GuideMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [projectBriefContext, setProjectBriefContext] = useState('')

  useEffect(() => {
    try {
      const persisted = localStorage.getItem(ASSISTANT_OPEN_KEY)
      if (persisted === '1') setOpen(true)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(ASSISTANT_OPEN_KEY, open ? '1' : '0')
    } catch {}
  }, [open, hydrated])

  const hidden = useMemo(() => {
    if (!pathname) return false
    return hiddenOnRoutes.some((pattern) => pattern.test(pathname))
  }, [pathname])

  const activeProjectId = useMemo(() => {
    if (!pathname) return null
    const match = pathname.match(/^\/dashboard\/projects\/([^/]+)/)
    return match?.[1] || null
  }, [pathname])

  const messageStorageKey = useMemo(() => {
    const projectScoped = activeProjectId && activeProjectId !== 'new'
    return projectScoped
      ? `${ASSISTANT_MESSAGES_KEY}:project:${activeProjectId}`
      : `${ASSISTANT_MESSAGES_KEY}:global`
  }, [activeProjectId])

  useEffect(() => {
    if (!hydrated) return
    try {
      const persistedMessages = localStorage.getItem(messageStorageKey)
      if (!persistedMessages) {
        setMessages([])
        return
      }
      const parsed = JSON.parse(persistedMessages) as unknown
      setMessages(toSafeGuideMessages(parsed))
    } catch {
      setMessages([])
    }
  }, [hydrated, messageStorageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      const bounded = messages.slice(-MAX_PERSISTED_MESSAGES)
      localStorage.setItem(messageStorageKey, JSON.stringify(bounded))
    } catch {}
  }, [messages, hydrated, messageStorageKey])

  useEffect(() => {
    if (!hydrated) return

    if (previousScopeRef.current === null) {
      previousScopeRef.current = messageStorageKey
      return
    }

    if (previousScopeRef.current === messageStorageKey) return

    const switchNotice: GuideMessage = {
      role: 'assistant',
      kind: 'system',
      content: activeProjectId && activeProjectId !== 'new'
        ? 'Context switched to this project. I will use this project details for guidance.'
        : 'Context switched to global workspace guidance.',
    }

    setMessages((prev) => [...prev, switchNotice].slice(-MAX_PERSISTED_MESSAGES))
    previousScopeRef.current = messageStorageKey
  }, [hydrated, messageStorageKey, activeProjectId])

  useEffect(() => {
    let cancelled = false

    const loadProjectContext = async () => {
      if (!activeProjectId || activeProjectId === 'new') {
        setProjectBriefContext('')
        return
      }
      try {
        const response = await fetch(`/api/projects/${activeProjectId}?excludeImages=1`)
        if (!response.ok) {
          if (!cancelled) setProjectBriefContext('')
          return
        }
        const data = await response.json()
        const md = typeof data?.files?.['project.md'] === 'string' ? data.files['project.md'] : ''
        const context = md.trim().slice(0, 2500)
        if (!cancelled) setProjectBriefContext(context)
      } catch {
        if (!cancelled) setProjectBriefContext('')
      }
    }

    loadProjectContext()
    return () => {
      cancelled = true
    }
  }, [activeProjectId])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    const nextMessages: GuideMessage[] = [...messages, { role: 'user', content: userMessage, kind: 'chat', createdAt: Date.now() }]
    setMessages(nextMessages)
    setIsLoading(true)

    const projectContext = projectBriefContext
      ? `\n\nCurrent project brief context (trimmed):\n${projectBriefContext}`
      : ''
    const systemPrompt = `You are AI Builder's floating guide assistant. Help users navigate and use features inside AI Builder only. Keep replies concise, practical, and non-technical unless asked. Never redirect users to third-party builders. Current route: ${pathname || 'unknown'}.${projectContext}`
    const chatOnlyMessages = nextMessages.filter((msg) => msg.kind !== 'system')
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...chatOnlyMessages.map((msg) => ({ role: msg.role, content: msg.content })),
    ]

    setMessages((prev) => [...prev, { role: 'assistant', content: '', kind: 'chat', createdAt: Date.now() }])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'qwen',
          model: 'qwen3-coder-plus',
          messages: apiMessages,
          maxTokens: 1200,
        }),
      })

      if (!response.ok || !response.body) throw new Error('Failed to stream response')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(part.slice(6))
            if (parsed.delta) {
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: last.content + parsed.delta }
                }
                return next
              })
            }
          } catch {
            continue
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          next[next.length - 1] = {
            ...last,
            content: 'Unable to answer right now. Please try again in a moment.',
          }
        }
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  const routeHint = useMemo(() => {
    if (!pathname) return 'Ask for quick guidance'
    if (pathname.startsWith('/dashboard/projects/')) return 'Guide assistant for this project page'
    if (pathname.startsWith('/dashboard/templates')) return 'Need help choosing a template?'
    if (pathname.startsWith('/dashboard/settings')) return 'Need help with account and settings?'
    if (pathname === '/dashboard') return 'Need help starting your next website?'
    return 'Ask for quick guidance'
  }, [pathname])

  if (!hydrated || hidden) return null

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#1a1a1a] px-4 py-2 text-xs font-medium text-white shadow-xl hover:bg-[#222] transition-colors"
        >
          <Sparkles className="h-4 w-4 text-purple-400" />
          Guide Assistant
        </button>
      )}

      {open && (
        <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[70] h-[72vh] w-[360px] max-w-[calc(100vw-12px)] sm:max-w-[calc(100vw-20px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#1a1a1a] px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-white">Guide Assistant</p>
              <p className="text-[10px] text-slate-400">{routeHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Minimize guide assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[calc(100%-49px)]">
            <div className="h-full flex flex-col bg-[#0f0f0f]">
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-400">Ask for help with planning, editing, deployment, or using dashboard tools.</p>
                ) : (
                  messages.map((message, index) => (
                    message.kind === 'system' ? (
                      <div key={index} className="py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-white/10" />
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">Context</span>
                          <div className="h-px flex-1 bg-white/10" />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400 text-center">{message.content}</p>
                      </div>
                    ) : (
                      <div key={index}>
                        <div
                          className={`rounded-lg px-2.5 py-2 text-xs whitespace-pre-wrap ${
                            message.role === 'user'
                              ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100 ml-6'
                              : 'bg-white/5 border border-white/10 text-slate-200 mr-6'
                          }`}
                        >
                          {message.content || (isLoading && index === messages.length - 1 ? 'Thinking…' : '')}
                        </div>
                        <p
                          className={`mt-1 text-[10px] text-slate-500 ${
                            message.role === 'user' ? 'text-right mr-1' : 'text-left ml-1'
                          }`}
                          title={formatRelativeTime(message.createdAt)}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    )
                  ))
                )}
              </div>

              <div className="border-t border-white/10 p-2.5 flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Ask the guide assistant..."
                  className="min-h-[60px] max-h-[140px] w-full resize-none rounded-lg border border-white/10 bg-[#121212] px-2 py-1.5 text-xs text-white outline-none focus:border-white/20"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 grid place-items-center transition-colors"
                  aria-label="Send"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
