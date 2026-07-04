"use client"

import { useMemo, useState } from "react"

const SECTION_TYPES = [
  { id: "nav", label: "Navigation Bar", color: "#334155" },
  { id: "hero", label: "Hero / Banner", color: "#2563eb" },
  { id: "header", label: "Page Header", color: "#3b82f6" },
  { id: "features", label: "Features", color: "#4f46e5" },
  { id: "services", label: "Services", color: "#4f46e5" },
  { id: "about", label: "About Us", color: "#0d9488" },
  { id: "team", label: "Team Members", color: "#0d9488" },
  { id: "portfolio", label: "Portfolio", color: "#db2777" },
  { id: "carousel", label: "Carousel", color: "#7c3aed" },
  { id: "gallery", label: "Gallery", color: "#db2777" },
  { id: "testimonials", label: "Testimonials", color: "#d97706" },
  { id: "blog", label: "Blog / News", color: "#7c3aed" },
  { id: "pricing", label: "Pricing Plans", color: "#ea580c" },
  { id: "faq", label: "FAQ", color: "#0891b2" },
  { id: "contact", label: "Contact Form", color: "#16a34a" },
  { id: "cta", label: "Call to Action", color: "#dc2626" },
  { id: "newsletter", label: "Newsletter", color: "#9333ea" },
  { id: "map", label: "Map / Location", color: "#059669" },
  { id: "search", label: "Search Bar", color: "#0284c7" },
  { id: "sidebar", label: "Sidebar", color: "#78716c" },
  { id: "footer", label: "Footer", color: "#1e293b" },
]

const ADVANCED_FEATURE_TYPES = [
  "carousel",
  "gallery",
  "testimonials",
  "pricing",
  "faq",
  "newsletter",
  "map",
  "search",
  "sidebar",
  "cta",
]

type SectionSize = "s" | "m" | "l"

type RowSection = {
  id: string
  size: SectionSize
}

type LayoutRow = {
  sections: RowSection[]
}

const DEFAULT_PAGE_SECTIONS = ["nav", "hero", "services", "about", "contact", "footer"]

interface LayoutOptionsProps {
  pageNames: string[]
  pageLayouts: Record<string, string[]>
  pageSectionSizes: Record<string, string[]>
  pageCarousel: Record<string, number>
  pageGallery: Record<string, number>
  onPageLayoutsChange: (layouts: Record<string, string[]>) => void
  onPageSectionSizesChange: (sizes: Record<string, string[]>) => void
  onPageCarouselChange: (carousel: Record<string, number>) => void
  onPageGalleryChange: (gallery: Record<string, number>) => void
  previewPrimaryColor?: string
  className?: string
}

const sectionTypeMap: Record<string, { label: string; color: string }> = {}
SECTION_TYPES.forEach((section) => {
  sectionTypeMap[section.id] = { label: section.label, color: section.color }
})

function getSectionStyle(id: string): { label: string; color: string } {
  return sectionTypeMap[id] ?? { label: id.charAt(0).toUpperCase() + id.slice(1), color: "#6b7280" }
}

function parsePageRows(layouts: string[] | undefined, sizes: string[] | undefined): LayoutRow[] {
  const safeLayouts = layouts && layouts.length > 0 ? layouts : DEFAULT_PAGE_SECTIONS
  const safeSizes = sizes ?? []

  return safeLayouts.map((layoutToken, rowIndex) => {
    const sizeToken = safeSizes[rowIndex] || ""

    if (layoutToken.startsWith("row:")) {
      const ids = layoutToken
        .slice(4)
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean)

      const rowSizes = sizeToken
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean)

      return {
        sections: ids.slice(0, 3).map((id, index) => {
          const value = rowSizes[index]
          const size: SectionSize = value === "s" || value === "l" ? value : "m"
          return { id, size }
        }),
      }
    }

    const value = sizeToken.trim()
    const size: SectionSize = value === "s" || value === "l" ? value : "m"
    return {
      sections: [{ id: layoutToken, size }],
    }
  }).filter((row) => row.sections.length > 0)
}

function serializeRows(rows: LayoutRow[]): { layouts: string[]; sizes: string[] } {
  const nextLayouts = rows.map((row) => {
    if (row.sections.length === 1) return row.sections[0].id
    return `row:${row.sections.map((section) => section.id).join("|")}`
  })

  const nextSizes = rows.map((row) => {
    if (row.sections.length === 1) return row.sections[0].size
    return row.sections.map((section) => section.size).join("|")
  })

  return { layouts: nextLayouts, sizes: nextSizes }
}

export function LayoutOptions({
  pageNames,
  pageLayouts,
  pageSectionSizes,
  pageCarousel,
  pageGallery,
  onPageLayoutsChange,
  onPageSectionSizesChange,
  onPageCarouselChange,
  onPageGalleryChange,
  previewPrimaryColor,
  className,
}: LayoutOptionsProps) {
  const safePages = pageNames.length > 0 ? pageNames : ["Home"]
  const [activePage, setActivePage] = useState<string>(safePages[0])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddAdvancedMenu, setShowAddAdvancedMenu] = useState(false)
  const [rowAddMenu, setRowAddMenu] = useState<number | null>(null)
  const [draggedRow, setDraggedRow] = useState<number | null>(null)
  const [draggedSection, setDraggedSection] = useState<{ rowIndex: number; sectionIndex: number } | null>(null)

  const currentRows = useMemo(
    () => parsePageRows(pageLayouts[activePage], pageSectionSizes[activePage]),
    [activePage, pageLayouts, pageSectionSizes]
  )

  const activeCarousel = pageCarousel[activePage] || 0
  const activeGallery = pageGallery[activePage] || 0

  const setActiveCarousel = (count: number) => {
    onPageCarouselChange({ ...pageCarousel, [activePage]: Math.max(0, count) })
  }

  const setActiveGallery = (count: number) => {
    onPageGalleryChange({ ...pageGallery, [activePage]: Math.max(0, count) })
  }

  const applyRows = (rows: LayoutRow[]) => {
    const { layouts, sizes } = serializeRows(rows)
    onPageLayoutsChange({ ...pageLayouts, [activePage]: layouts })
    onPageSectionSizesChange({ ...pageSectionSizes, [activePage]: sizes })
  }

  const addSection = (id: string) => {
    const nextRows = [...currentRows, { sections: [{ id, size: "m" as SectionSize }] }]
    applyRows(nextRows)

    if (id === "carousel" && !activeCarousel) setActiveCarousel(3)
    if (id === "gallery" && !activeGallery) setActiveGallery(4)

    setShowAddMenu(false)
  }

  const addAdvancedFeature = (id: string) => {
    const nextRows = [...currentRows, { sections: [{ id, size: "m" as SectionSize }] }]
    applyRows(nextRows)

    if (id === "carousel" && !activeCarousel) setActiveCarousel(3)
    if (id === "gallery" && !activeGallery) setActiveGallery(4)

    setShowAddAdvancedMenu(false)
  }

  const addSectionToRow = (rowIndex: number, id: string) => {
    const row = currentRows[rowIndex]
    if (!row || row.sections.length >= 3) return

    const nextRows = [...currentRows]
    nextRows[rowIndex] = {
      ...nextRows[rowIndex],
      sections: [...nextRows[rowIndex].sections, { id, size: "m" as SectionSize }],
    }
    applyRows(nextRows)

    if (id === "carousel" && !activeCarousel) setActiveCarousel(3)
    if (id === "gallery" && !activeGallery) setActiveGallery(4)

    setRowAddMenu(null)
  }

  const moveSectionToRow = (fromRow: number, fromIndex: number, toRow: number) => {
    if (fromRow === toRow) return

    const target = currentRows[toRow]
    if (!target || target.sections.length >= 3) return

    const nextRows = currentRows.map((row) => ({ ...row, sections: [...row.sections] }))
    const moving = nextRows[fromRow]?.sections[fromIndex]
    if (!moving) return

    nextRows[fromRow].sections.splice(fromIndex, 1)

    let adjustedToRow = toRow
    if (nextRows[fromRow].sections.length === 0) {
      nextRows.splice(fromRow, 1)
      if (fromRow < toRow) adjustedToRow -= 1
    }

    nextRows[adjustedToRow].sections.push(moving)
    applyRows(nextRows)
  }

  const moveRow = (rowIndex: number, direction: -1 | 1) => {
    const targetIndex = rowIndex + direction
    if (targetIndex < 0 || targetIndex >= currentRows.length) return

    const nextRows = [...currentRows]
    ;[nextRows[rowIndex], nextRows[targetIndex]] = [nextRows[targetIndex], nextRows[rowIndex]]
    applyRows(nextRows)
  }

  const moveInsideRow = (rowIndex: number, sectionIndex: number, direction: -1 | 1) => {
    const row = currentRows[rowIndex]
    const targetIndex = sectionIndex + direction
    if (!row || targetIndex < 0 || targetIndex >= row.sections.length) return

    const nextRows = [...currentRows]
    const nextRowSections = [...nextRows[rowIndex].sections]
    ;[nextRowSections[sectionIndex], nextRowSections[targetIndex]] = [nextRowSections[targetIndex], nextRowSections[sectionIndex]]
    nextRows[rowIndex] = { ...nextRows[rowIndex], sections: nextRowSections }
    applyRows(nextRows)
  }

  const setSectionSize = (rowIndex: number, sectionIndex: number, size: SectionSize) => {
    const nextRows = [...currentRows]
    const nextRowSections = [...nextRows[rowIndex].sections]
    nextRowSections[sectionIndex] = { ...nextRowSections[sectionIndex], size }
    nextRows[rowIndex] = { ...nextRows[rowIndex], sections: nextRowSections }
    applyRows(nextRows)
  }

  const removeSection = (rowIndex: number, sectionIndex: number) => {
    const row = currentRows[rowIndex]
    if (!row) return

    const sectionId = row.sections[sectionIndex]?.id
    if (sectionId === "carousel") setActiveCarousel(0)
    if (sectionId === "gallery") setActiveGallery(0)

    const nextRows = [...currentRows]
    const nextRowSections = [...nextRows[rowIndex].sections]
    nextRowSections.splice(sectionIndex, 1)

    if (nextRowSections.length === 0) {
      nextRows.splice(rowIndex, 1)
    } else {
      nextRows[rowIndex] = { ...nextRows[rowIndex], sections: nextRowSections }
    }

    applyRows(nextRows.length > 0 ? nextRows : parsePageRows(undefined, undefined))
  }

  const groupWithPrevious = (rowIndex: number, sectionIndex: number) => {
    if (rowIndex === 0) return

    const previousRow = currentRows[rowIndex - 1]
    if (!previousRow || previousRow.sections.length >= 3) return

    const nextRows = [...currentRows]
    const sectionToMove = nextRows[rowIndex].sections[sectionIndex]
    if (!sectionToMove) return

    nextRows[rowIndex - 1] = {
      ...nextRows[rowIndex - 1],
      sections: [...nextRows[rowIndex - 1].sections, sectionToMove],
    }

    const currentSections = [...nextRows[rowIndex].sections]
    currentSections.splice(sectionIndex, 1)

    if (currentSections.length === 0) {
      nextRows.splice(rowIndex, 1)
    } else {
      nextRows[rowIndex] = { ...nextRows[rowIndex], sections: currentSections }
    }

    applyRows(nextRows)
  }

  const ungroupSection = (rowIndex: number, sectionIndex: number) => {
    const row = currentRows[rowIndex]
    if (!row || row.sections.length <= 1) return

    const section = row.sections[sectionIndex]
    const nextRows = [...currentRows]

    const remaining = [...nextRows[rowIndex].sections]
    remaining.splice(sectionIndex, 1)
    nextRows[rowIndex] = { ...nextRows[rowIndex], sections: remaining }

    nextRows.splice(rowIndex + 1, 0, { sections: [section] })
    applyRows(nextRows)
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Layout & Structure</h2>
        <p className="text-gray-500 text-sm">Build rows like Scratch blocks: place 1, 2, or 3 sections on the same row, reorder rows, and tune each block size.</p>
      </div>

      <div className="flex gap-1 flex-wrap mb-6 border-b pb-3">
        {safePages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setActivePage(page)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
              activePage === page
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-4">
        {currentRows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="border-2 border-gray-100 rounded-xl p-2.5 bg-white"
            draggable
            onDragStart={() => setDraggedRow(rowIndex)}
            onDragEnd={() => setDraggedRow(null)}
            onDragOver={(event) => {
              event.preventDefault()
            }}
            onDrop={() => {
              if (draggedSection) {
                moveSectionToRow(draggedSection.rowIndex, draggedSection.sectionIndex, rowIndex)
                setDraggedSection(null)
                return
              }

              if (draggedRow === null || draggedRow === rowIndex) return
              const nextRows = [...currentRows]
              const [movingRow] = nextRows.splice(draggedRow, 1)
              nextRows.splice(rowIndex, 0, movingRow)
              applyRows(nextRows)
              setDraggedRow(null)
            }}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Row {rowIndex + 1} • {row.sections.length}/3 sections
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRowAddMenu((value) => (value === rowIndex ? null : rowIndex))}
                  disabled={row.sections.length >= 3}
                  className="text-[10px] leading-none px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  + Add item
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(rowIndex, -1)}
                  disabled={rowIndex === 0}
                  className="text-[10px] leading-none px-2 py-1 rounded bg-gray-100 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Row ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(rowIndex, 1)}
                  disabled={rowIndex === currentRows.length - 1}
                  className="text-[10px] leading-none px-2 py-1 rounded bg-gray-100 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Row ↓
                </button>
              </div>
            </div>

            <div className={`grid gap-2 ${row.sections.length === 1 ? "grid-cols-1" : row.sections.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {row.sections.map((section, sectionIndex) => {
                const { label, color } = getSectionStyle(section.id)

                return (
                  <div
                    key={`${rowIndex}-${sectionIndex}-${section.id}`}
                    className="border border-gray-200 rounded-lg p-2 bg-gray-50"
                    draggable
                    onDragStart={(event) => {
                      event.stopPropagation()
                      setDraggedSection({ rowIndex, sectionIndex })
                    }}
                    onDragEnd={(event) => {
                      event.stopPropagation()
                      setDraggedSection(null)
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-5 rounded-sm" style={{ background: color }} />
                      <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
                    </div>

                    {(section.id === "carousel" || section.id === "gallery") && (
                      <div className={`mb-2 flex items-center gap-1.5 text-[11px] ${section.id === "carousel" ? "text-purple-700" : "text-fuchsia-700"}`}>
                        <button
                          type="button"
                          className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white font-bold"
                          onClick={() =>
                            section.id === "carousel"
                              ? setActiveCarousel(Math.max(2, activeCarousel - 1))
                              : setActiveGallery(Math.max(2, activeGallery - 1))
                          }
                        >
                          −
                        </button>
                        <span className="font-semibold w-5 text-center">
                          {section.id === "carousel" ? activeCarousel || 3 : activeGallery || 4}
                        </span>
                        <button
                          type="button"
                          className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white font-bold"
                          onClick={() =>
                            section.id === "carousel"
                              ? setActiveCarousel(Math.min(8, (activeCarousel || 3) + 1))
                              : setActiveGallery(Math.min(12, (activeGallery || 4) + 1))
                          }
                        >
                          +
                        </button>
                        <span className="text-gray-500">{section.id === "carousel" ? "slides" : "images"}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 mb-2">
                      {(["s", "m", "l"] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSectionSize(rowIndex, sectionIndex, size)}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${section.size === size ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-blue-100"}`}
                        >
                          {size.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => moveInsideRow(rowIndex, sectionIndex, -1)}
                        disabled={sectionIndex === 0}
                        className="text-[10px] leading-none px-2 py-1 rounded bg-white border border-gray-200 hover:bg-blue-100 disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveInsideRow(rowIndex, sectionIndex, 1)}
                        disabled={sectionIndex === row.sections.length - 1}
                        className="text-[10px] leading-none px-2 py-1 rounded bg-white border border-gray-200 hover:bg-blue-100 disabled:opacity-30"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => groupWithPrevious(rowIndex, sectionIndex)}
                        disabled={rowIndex === 0 || currentRows[rowIndex - 1].sections.length >= 3}
                        className="text-[10px] leading-none px-2 py-1 rounded bg-white border border-gray-200 hover:bg-blue-100 disabled:opacity-30"
                      >
                        Group ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => ungroupSection(rowIndex, sectionIndex)}
                        disabled={row.sections.length <= 1}
                        className="text-[10px] leading-none px-2 py-1 rounded bg-white border border-gray-200 hover:bg-blue-100 disabled:opacity-30"
                      >
                        Ungroup
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSection(rowIndex, sectionIndex)}
                        className="text-[10px] leading-none px-2 py-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {rowAddMenu === rowIndex && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                <p className="text-[11px] font-semibold text-emerald-700 mb-2">Add item to this row ({row.sections.length}/3)</p>
                <div className="grid grid-cols-2 gap-1">
                  {SECTION_TYPES.map((section) => (
                    <button
                      key={`row-${rowIndex}-add-${section.id}`}
                      type="button"
                      onClick={() => addSectionToRow(rowIndex, section.id)}
                      disabled={row.sections.length >= 3}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-emerald-100 hover:bg-emerald-100 text-left transition-colors disabled:opacity-40"
                    >
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: section.color }} />
                      <span className="text-[11px] font-medium text-gray-700 truncate">{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowAddMenu((value) => !value)
              setShowAddAdvancedMenu(false)
            }}
            className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-base font-bold">+</span> Add Section (new row)
          </button>

          {showAddMenu && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-2 grid grid-cols-1 gap-1 max-h-64 overflow-auto">
              {SECTION_TYPES.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => addSection(section.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-left transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: section.color }} />
                  <span className="text-xs font-medium text-gray-700">{section.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowAddAdvancedMenu((value) => !value)
              setShowAddMenu(false)
            }}
            className="w-full py-2 rounded-xl border-2 border-dashed border-violet-300 text-sm text-violet-600 hover:border-violet-500 hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-base font-bold">+</span> Add Advanced Feature
          </button>

          {showAddAdvancedMenu && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-violet-200 shadow-xl z-50 p-2 grid grid-cols-1 gap-1">
              {SECTION_TYPES.filter((section) => ADVANCED_FEATURE_TYPES.includes(section.id)).map((section) => (
                <button
                  key={`advanced-${section.id}`}
                  type="button"
                  onClick={() => addAdvancedFeature(section.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-violet-50 text-left transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: section.color }} />
                  <span className="text-xs font-medium text-gray-700">{section.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Live Preview (Rows)</p>
        <div className="space-y-1.5">
          {currentRows.map((row, rowIndex) => (
            <div key={`preview-row-${rowIndex}`} className={`grid gap-1 ${row.sections.length === 1 ? "grid-cols-1" : row.sections.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {row.sections.map((section, sectionIndex) => {
                const { label, color } = getSectionStyle(section.id)
                const height = section.size === "s" ? 36 : section.size === "l" ? 60 : 46
                const previewBackground = previewPrimaryColor
                  ? `linear-gradient(135deg, ${color}, ${previewPrimaryColor})`
                  : color
                return (
                  <div
                    key={`preview-${rowIndex}-${sectionIndex}`}
                    className="rounded-sm flex items-center justify-center"
                    style={{ height: `${height}px`, background: previewBackground, opacity: 0.9 }}
                  >
                    <span className="text-white font-bold truncate px-2" style={{ fontSize: "9px", letterSpacing: "0.04em" }}>
                      {label.toUpperCase()}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
