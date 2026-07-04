"use client"

import { useState } from "react"

export interface DesignStyle {
  id: string
  name: string
  description: string
  features: string[]
  colorScheme: string[]
  bgClass: string
  emoji: string
}

const DESIGN_STYLES: DesignStyle[] = [
  {
    id: 'business',
    name: 'Modern Business',
    description: 'Clean, professional layouts focused on conversions and trust',
    features: ['Professional Color Schemes', 'Trust Indicators', 'Clear CTAs', 'Corporate Typography'],
    colorScheme: ['#1e40af', '#3b82f6', '#f8fafc', '#1f2937'],
    bgClass: 'from-blue-50 to-blue-100 border-blue-200',
    emoji: '💼'
  },
  {
    id: 'creative',
    name: 'Creative & Artistic',
    description: 'Bold designs with unique layouts and vibrant artistic elements',
    features: ['Bold Color Palettes', 'Unique Layouts', 'Creative Animations', 'Artistic Typography'],
    colorScheme: ['#7c3aed', '#f59e0b', '#ef4444', '#10b981'],
    bgClass: 'from-purple-50 to-pink-100 border-purple-200',
    emoji: '🎨'
  },
  {
    id: 'minimalist',
    name: 'Clean Minimalist',
    description: 'Simple, elegant designs with focus on whitespace and typography',
    features: ['Lots of Whitespace', 'Typography Focus', 'Subtle Effects', 'Clean Lines'],
    colorScheme: ['#374151', '#6b7280', '#f9fafb', '#111827'],
    bgClass: 'from-gray-50 to-gray-100 border-gray-300',
    emoji: '⬜'
  },
  {
    id: 'corporate',
    name: 'Corporate & Formal',
    description: 'Authoritative, structured layouts for enterprise and finance',
    features: ['Dark Navy Palette', 'Serif Typography', 'Structured Grids', 'Formal Tone'],
    colorScheme: ['#0f172a', '#1e3a5f', '#c9a84c', '#f1f5f9'],
    bgClass: 'from-slate-100 to-blue-50 border-slate-300',
    emoji: '🏛️'
  },
  {
    id: 'tech-modern',
    name: 'Tech & Futuristic',
    description: 'Dark mode with glowing accents — perfect for tech products & SaaS',
    features: ['Dark Mode', 'Neon Accents', 'Code Aesthetics', 'Gradient Effects'],
    colorScheme: ['#0f0f23', '#6366f1', '#06b6d4', '#a855f7'],
    bgClass: 'from-indigo-950 to-purple-900 border-indigo-500',
    emoji: '🚀'
  },
  {
    id: 'warm-vibrant',
    name: 'Warm & Friendly',
    description: 'Energetic orange and warm tones — great for food, lifestyle & wellness',
    features: ['Warm Color Palette', 'Rounded Shapes', 'Inviting CTAs', 'Friendly Typography'],
    colorScheme: ['#ea580c', '#f59e0b', '#fef3c7', '#78350f'],
    bgClass: 'from-orange-50 to-amber-100 border-orange-200',
    emoji: '☀️'
  },
  {
    id: 'elegant-luxury',
    name: 'Elegant & Luxury',
    description: 'Premium gold-on-dark aesthetic for upscale brands and boutiques',
    features: ['Gold Accents', 'Serif Headlines', 'Dark Backgrounds', 'Premium Feel'],
    colorScheme: ['#1a1a1a', '#c9a84c', '#f5f0e8', '#6b5a3e'],
    bgClass: 'from-yellow-900 to-stone-800 border-yellow-700',
    emoji: '✨'
  },
  {
    id: 'bold-playful',
    name: 'Bold & Playful',
    description: 'Fun, energetic designs with bright colors for kids, events & retail',
    features: ['Bright Colors', 'Playful Fonts', 'Rounded UI', 'Energetic CTAs'],
    colorScheme: ['#ec4899', '#f97316', '#22c55e', '#3b82f6'],
    bgClass: 'from-pink-50 to-green-50 border-pink-200',
    emoji: '🎉'
  }
]

interface DesignStylePickerProps {
  selectedStyle: string
  onStyleChange: (styleId: string) => void
  className?: string
  brandColors?: string[]
}

export function DesignStylePicker({ 
  selectedStyle, 
  onStyleChange, 
  className,
  brandColors = []
}: DesignStylePickerProps) {
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null)
  const hasBrandColors = brandColors.length > 0

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Design Style</h2>
        <p className="text-gray-600">
          Select the layout &amp; typography direction. Your brand colors will always be applied.
        </p>
      </div>

      {hasBrandColors && (
        <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex gap-1.5 shrink-0">
            {brandColors.map((c, i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
          <div>
            <span className="text-sm font-semibold text-green-800">Your brand colors will be used</span>
            <p className="text-xs text-green-600 leading-tight">The style controls layout &amp; typography — your colors replace the preset palette</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DESIGN_STYLES.map((style) => {
          const isSelected = selectedStyle === style.id
          const isDark = style.id === 'tech-modern' || style.id === 'elegant-luxury'

          return (
            <div
              key={style.id}
              className={`
                relative rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden group
                ${isSelected 
                  ? 'border-blue-500 shadow-xl ring-2 ring-blue-200 scale-[1.02]' 
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }
              `}
              onClick={() => onStyleChange(style.id)}
              onMouseEnter={() => setHoveredStyle(style.id)}
              onMouseLeave={() => setHoveredStyle(null)}
            >
              {/* Color Banner */}
              <div
                className="h-16 flex items-center justify-center relative overflow-hidden"
                style={{
                  background: hasBrandColors
                    ? `linear-gradient(135deg, ${brandColors[0]}, ${brandColors[1] || brandColors[0]})`
                    : `linear-gradient(135deg, ${style.colorScheme[0]}, ${style.colorScheme[1]})`,
                }}
              >
                <span className="text-3xl z-10 drop-shadow-sm">{style.emoji}</span>
                {/* Mini layout wireframe */}
                <div className="absolute inset-0 opacity-20">
                  <div className="w-full h-2 bg-white/50 mt-1.5" />
                  <div className="flex gap-1 px-1 mt-1">
                    {[40, 30, 50, 35].map((w, i) => (
                      <div key={i} className="h-1 bg-white/60 rounded" style={{width: `${w}%`, flex: 'none'}} />
                    ))}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">✓</div>
                )}
              </div>

              {/* Card body */}
              <div className="p-3 bg-white">
                <h3 className="text-[13px] font-bold text-gray-900 leading-tight">{style.name}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5 mb-2 leading-snug line-clamp-2">{style.description}</p>

                {/* Color dots — brand colors when available, else preset */}
                <div className="flex gap-1 mb-2 flex-wrap">
                  {(hasBrandColors ? brandColors : style.colorScheme).map((color, ci) => (
                    <div
                      key={ci}
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {hasBrandColors && <span className="text-[9px] text-green-600 font-semibold self-center ml-0.5">your colors</span>}
                </div>

                {/* Features */}
                <ul className="space-y-0.5">
                  {style.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="text-[10px] text-gray-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`
                    w-full mt-3 py-1.5 px-3 rounded-lg text-xs font-medium transition-all
                    ${isSelected 
                      ? 'bg-blue-500 text-white shadow' 
                      : 'bg-gray-100 text-gray-700 group-hover:bg-blue-500 group-hover:text-white'
                    }
                  `}
                  onClick={(e) => { e.stopPropagation(); onStyleChange(style.id) }}
                >
                  {isSelected ? '✓ Selected' : 'Select Style'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Summary */}
      {selectedStyle && (
        <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{DESIGN_STYLES.find(s => s.id === selectedStyle)?.emoji}</span>
            <div>
              <h4 className="font-semibold text-blue-900 text-sm">
                {DESIGN_STYLES.find(s => s.id === selectedStyle)?.name} Selected
              </h4>
              <p className="text-xs text-blue-700">
                {DESIGN_STYLES.find(s => s.id === selectedStyle)?.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
