"use client"

import { FOOTER_STYLE_OPTIONS } from "@/lib/wizard-config"

interface FooterStyleSelectorProps {
  selectedFooterStyle: string
  onChange: (footerStyle: string) => void
}

export function FooterPreview({ id, active }: { id: string; active: boolean }) {
  const tone = active ? "border-blue-200 bg-blue-50/70" : "border-gray-200 bg-gray-50"
  const line = active ? "bg-blue-500/80" : "bg-slate-400/80"
  const soft = active ? "bg-blue-200/80" : "bg-slate-200"
  const dark = active ? "bg-slate-800" : "bg-slate-700"

  if (id === "minimal") {
    return (
      <div className={`rounded-xl border ${tone} p-3 h-24 flex flex-col justify-end`}>
        <div className={`h-8 rounded-lg ${dark} px-3 py-2 flex items-center justify-between`}>
          <div className={`h-2.5 w-16 rounded-full ${line}`} />
          <div className="flex gap-1.5">
            <div className={`h-2 w-8 rounded-full ${soft}`} />
            <div className={`h-2 w-8 rounded-full ${soft}`} />
          </div>
        </div>
      </div>
    )
  }

  if (id === "centered") {
    return (
      <div className={`rounded-xl border ${tone} p-3 h-24 flex flex-col justify-end`}>
        <div className={`rounded-lg ${dark} px-3 py-3 flex flex-col items-center gap-2`}>
          <div className={`h-2.5 w-16 rounded-full ${line}`} />
          <div className="flex gap-1.5">
            <div className={`h-2 w-8 rounded-full ${soft}`} />
            <div className={`h-2 w-8 rounded-full ${soft}`} />
            <div className={`h-2 w-8 rounded-full ${soft}`} />
          </div>
        </div>
      </div>
    )
  }

  if (id === "columns") {
    return (
      <div className={`rounded-xl border ${tone} p-3 h-24 flex flex-col justify-end`}>
        <div className={`rounded-lg ${dark} p-3 grid grid-cols-3 gap-2`}>
          <div className="space-y-1.5">
            <div className={`h-2 w-10 rounded-full ${line}`} />
            <div className={`h-2 w-8 rounded-full ${soft}`} />
          </div>
          <div className="space-y-1.5">
            <div className={`h-2 w-10 rounded-full ${line}`} />
            <div className={`h-2 w-8 rounded-full ${soft}`} />
          </div>
          <div className="space-y-1.5">
            <div className={`h-2 w-10 rounded-full ${line}`} />
            <div className={`h-2 w-8 rounded-full ${soft}`} />
          </div>
        </div>
      </div>
    )
  }

  if (id === "visual") {
    return (
      <div className={`rounded-xl border ${tone} p-3 h-24 flex flex-col justify-end`}>
        <div className="rounded-lg bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 p-3 flex items-center justify-between">
          <div>
            <div className={`h-2.5 w-16 rounded-full ${line}`} />
            <div className={`h-2 w-12 rounded-full ${soft} mt-2`} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="h-5 w-5 rounded-md bg-white/20" />
            <div className="h-5 w-5 rounded-md bg-white/15" />
            <div className="h-5 w-5 rounded-md bg-white/15" />
            <div className="h-5 w-5 rounded-md bg-white/20" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${tone} p-3 h-24 flex flex-col justify-end`}>
      <div className={`rounded-lg ${dark} p-3 space-y-2`}>
        <div className="flex items-center justify-between">
          <div className={`h-2.5 w-16 rounded-full ${line}`} />
          <div className={`h-5 w-12 rounded-md ${soft}`} />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className={`h-2 w-full rounded-full ${soft}`} />
          <div className={`h-2 w-full rounded-full ${soft}`} />
          <div className={`h-2 w-full rounded-full ${soft}`} />
        </div>
      </div>
    </div>
  )
}

export function FooterStyleSelector({ selectedFooterStyle, onChange }: FooterStyleSelectorProps) {
  return (
    <div className="mt-6 pt-6 border-t">
      <h3 className="text-base font-bold text-gray-900 mb-1">🦶 Footer Style</h3>
      <p className="text-sm text-gray-500 mb-4">Choose how the bottom of the website should feel.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {FOOTER_STYLE_OPTIONS.map((option) => {
          const isActive = selectedFooterStyle === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              title={option.desc}
              className={`rounded-2xl border-2 p-3 text-left transition-all ${
                isActive
                  ? "border-blue-600 bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              <FooterPreview id={option.id} active={isActive} />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <div className={`font-semibold ${isActive ? "text-blue-900" : "text-gray-900"}`}>{option.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{option.desc}</div>
                </div>
                {isActive && <span className="text-blue-600 font-bold">✓</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
