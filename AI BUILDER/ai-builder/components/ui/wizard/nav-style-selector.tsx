"use client"

import { NAV_STYLE_OPTIONS } from "@/lib/wizard-config"

interface NavStyleSelectorProps {
  selectedNavType: string
  onChange: (navType: string) => void
}

export function NavPreview({ id, active }: { id: string; active: boolean }) {
  const shell = active ? "border-blue-200 bg-blue-50/70" : "border-gray-200 bg-gray-50"
  const dark = active ? "bg-slate-800" : "bg-slate-700"
  const line = active ? "bg-blue-500/80" : "bg-slate-400/80"
  const pill = active ? "bg-blue-200/90" : "bg-slate-200"

  if (id === "side-drawer") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24`}>
        <div className="grid grid-cols-[18px,1fr] gap-2 h-full">
          <div className={`rounded-lg ${dark} flex flex-col items-center justify-center gap-1`}>
            <div className={`h-1.5 w-2.5 rounded-full ${pill}`} />
            <div className={`h-1.5 w-2.5 rounded-full ${pill}`} />
            <div className={`h-1.5 w-2.5 rounded-full ${pill}`} />
          </div>
          <div className="rounded-lg bg-white/80 border border-gray-200 flex flex-col justify-between p-2">
            <div className={`h-2.5 w-16 rounded-full ${line}`} />
            <div className="space-y-1.5">
              <div className={`h-2 w-20 rounded-full ${pill}`} />
              <div className={`h-2 w-16 rounded-full ${pill}`} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (id === "tab-bar") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24 flex flex-col justify-between`}>
        <div className="rounded-lg bg-white/80 border border-gray-200 h-12" />
        <div className={`rounded-xl ${dark} p-2 grid grid-cols-4 gap-2`}>
          <div className={`h-5 rounded-lg ${pill}`} />
          <div className={`h-5 rounded-lg ${pill}`} />
          <div className={`h-5 rounded-lg ${pill}`} />
          <div className={`h-5 rounded-lg ${pill}`} />
        </div>
      </div>
    )
  }

  if (id === "floating-nav") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24 flex flex-col justify-between`}>
        <div className="rounded-lg bg-white/80 border border-gray-200 h-10" />
        <div className="flex justify-center">
          <div className={`rounded-full ${dark} px-4 py-2 flex gap-2`}>
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
          </div>
        </div>
      </div>
    )
  }

  if (id === "split-nav") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24`}>
        <div className={`rounded-lg ${dark} p-3 flex items-center justify-between`}>
          <div className="flex gap-1.5">
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
          </div>
          <div className={`h-2.5 w-14 rounded-full ${line}`} />
          <div className="flex gap-1.5">
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
          </div>
        </div>
      </div>
    )
  }

  if (id === "centered-nav") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24`}>
        <div className={`rounded-lg ${dark} p-3 flex flex-col items-center gap-2`}>
          <div className={`h-2.5 w-14 rounded-full ${line}`} />
          <div className="flex gap-1.5">
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
          </div>
        </div>
      </div>
    )
  }

  if (id === "hamburger") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24`}>
        <div className={`rounded-lg ${dark} p-3 flex items-center justify-between`}>
          <div className={`h-2.5 w-14 rounded-full ${line}`} />
          <div className="space-y-1">
            <div className={`h-1.5 w-5 rounded-full ${pill}`} />
            <div className={`h-1.5 w-5 rounded-full ${pill}`} />
            <div className={`h-1.5 w-5 rounded-full ${pill}`} />
          </div>
        </div>
      </div>
    )
  }

  if (id === "breadcrumbs") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24 flex flex-col gap-2`}>
        <div className={`rounded-lg ${dark} p-3 flex items-center gap-2`}>
          <div className={`h-2 w-7 rounded-full ${pill}`} />
          <div className={`h-1 w-2 rounded-full ${softClass(active)}`} />
          <div className={`h-2 w-7 rounded-full ${pill}`} />
          <div className={`h-1 w-2 rounded-full ${softClass(active)}`} />
          <div className={`h-2 w-7 rounded-full ${line}`} />
        </div>
        <div className="rounded-lg bg-white/80 border border-gray-200 flex-1" />
      </div>
    )
  }

  if (id === "mega-menu") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24 flex flex-col gap-2`}>
        <div className={`rounded-lg ${dark} p-3 flex items-center justify-between`}>
          <div className={`h-2.5 w-14 rounded-full ${line}`} />
          <div className="flex gap-1.5">
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
            <div className={`h-2 w-8 rounded-full ${pill}`} />
          </div>
        </div>
        <div className="rounded-lg bg-white/80 border border-gray-200 p-2 grid grid-cols-3 gap-2 flex-1">
          <div className={`rounded-md ${pill}`} />
          <div className={`rounded-md ${pill}`} />
          <div className={`rounded-md ${pill}`} />
        </div>
      </div>
    )
  }

  if (id === "no-nav") {
    return (
      <div className={`rounded-xl border ${shell} p-3 h-24 flex items-center justify-center`}>
        <div className="rounded-lg bg-white/80 border border-dashed border-gray-300 w-full h-full flex items-center justify-center text-xs font-semibold text-gray-400">
          No menu bar
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${shell} p-3 h-24`}>
      <div className={`rounded-lg ${dark} p-3 flex items-center justify-between`}>
        <div className={`h-2.5 w-14 rounded-full ${line}`} />
        <div className="flex gap-1.5">
          <div className={`h-2 w-8 rounded-full ${pill}`} />
          <div className={`h-2 w-8 rounded-full ${pill}`} />
          <div className={`h-2 w-8 rounded-full ${pill}`} />
        </div>
      </div>
    </div>
  )
}

function softClass(active: boolean) {
  return active ? "bg-blue-300/80" : "bg-slate-300"
}

export function NavStyleSelector({ selectedNavType, onChange }: NavStyleSelectorProps) {
  return (
    <div className="mt-6 pt-6 border-t">
      <h3 className="text-base font-bold text-gray-900 mb-1">🧭 Navigation Style</h3>
      <p className="text-sm text-gray-500 mb-3">How visitors navigate between sections of your site</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {NAV_STYLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            title={option.desc}
            className={`rounded-2xl border-2 p-3 text-left transition-all ${
              selectedNavType === option.id
                ? "border-blue-600 bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <NavPreview id={option.id} active={selectedNavType === option.id} />
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <div className={`font-semibold ${selectedNavType === option.id ? "text-blue-900" : "text-gray-900"}`}>
                  <span className="mr-1.5">{option.icon}</span>
                  {option.label}
                </div>
                <div className="text-sm text-gray-500 mt-1">{option.desc}</div>
              </div>
              {selectedNavType === option.id && <span className="text-blue-600 font-bold">✓</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
