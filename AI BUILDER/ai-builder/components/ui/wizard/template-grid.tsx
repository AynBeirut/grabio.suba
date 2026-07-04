"use client"

import { useMemo, useState } from "react"
import { CUSTOM_TEMPLATE, buildTemplateLayout } from "@/lib/wizard-config"

interface TemplateItem {
  id: string
  name: string
  icon: string
  description: string
  sections?: string[]
}

interface TemplateGridProps {
  templatesByCategory: Record<string, TemplateItem[]>
  selectedCategory: string
  selectedTemplate: string
  onSelectTemplate: (templateId: string) => void
  onSelectCategory?: (category: string) => void
}

function TemplateDivisionPreview({ sections }: { sections: string[] }) {
  const layout = useMemo(() => buildTemplateLayout(sections), [sections])

  const rows = useMemo(() => {
    return layout.pageLayouts.map((token, index) => {
      const ids = token.startsWith("row:") ? token.slice(4).split("|").filter(Boolean) : [token]
      const sizeToken = layout.pageSectionSizes[index] || "m"
      const sizes = sizeToken.split("|").filter(Boolean)

      const alignedSizes = ids.map((_, sizeIndex) => sizes[sizeIndex] || "m")
      const rowWeight = alignedSizes.some((size) => size === "l") ? 3 : alignedSizes.some((size) => size === "m") ? 2 : 1

      return {
        ids,
        sizes: alignedSizes,
        rowWeight,
      }
    })
  }, [layout.pageLayouts, layout.pageSectionSizes])

  const getRowHeightClass = (rowWeight: number): string => {
    if (rowWeight >= 3) return "flex-[3] min-h-14"
    if (rowWeight === 2) return "flex-[2] min-h-10"
    return "flex-1 min-h-6"
  }

  const getSectionToneClass = (sectionName: string): string => {
    const name = sectionName.toLowerCase()
    if (name.includes("nav")) return "bg-slate-600"
    if (name.includes("footer")) return "bg-slate-800"
    if (name.includes("hero") || name.includes("banner") || name.includes("header")) return "bg-blue-600"
    if (name.includes("product") || name.includes("catalog") || name.includes("listing") || name.includes("collection") || name.includes("lookbook")) return "bg-violet-600"
    if (name.includes("gallery") || name.includes("portfolio") || name.includes("photo")) return "bg-pink-600"
    if (name.includes("service") || name.includes("feature") || name.includes("class") || name.includes("menu") || name.includes("amenity")) return "bg-indigo-600"
    if (name.includes("about") || name.includes("story") || name.includes("mission") || name.includes("team") || name.includes("staff") || name.includes("doctor") || name.includes("agent")) return "bg-teal-600"
    if (name.includes("contact") || name.includes("booking") || name.includes("reserve") || name.includes("rsvp") || name.includes("enroll") || name.includes("register") || name.includes("subscribe") || name.includes("quote")) return "bg-green-600"
    if (name.includes("review") || name.includes("testimonial")) return "bg-amber-600"
    if (name.includes("price") || name.includes("plan") || name.includes("package") || name.includes("tier")) return "bg-orange-600"
    if (name.includes("search")) return "bg-cyan-600"
    return "bg-gray-500"
  }

  return (
    <div className="absolute inset-0 p-2 bg-slate-50">
      <div className="space-y-1 h-full flex flex-col">
        {rows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={`grid gap-1 ${row.ids.length === 1 ? "grid-cols-1" : row.ids.length === 2 ? "grid-cols-2" : "grid-cols-3"} ${getRowHeightClass(row.rowWeight)}`}
          >
            {row.ids.map((section, index) => (
              <div
                key={`section-${rowIndex}-${index}`}
                className={`rounded-sm border border-white/70 ${getSectionToneClass(section)}`}
                title={section}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TemplateGrid({
  templatesByCategory,
  selectedCategory,
  selectedTemplate,
  onSelectTemplate,
  onSelectCategory,
}: TemplateGridProps) {
  const [searchText, setSearchText] = useState("")
  const [sortBy, setSortBy] = useState<"featured" | "name-asc" | "name-desc">("featured")
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const categories = useMemo(() => {
    return Object.keys(templatesByCategory)
  }, [templatesByCategory])

  const activeCategory = selectedCategory || categories[0] || ""
  const list = useMemo(() => {
    const base = activeCategory ? templatesByCategory[activeCategory] || [] : []
    return [CUSTOM_TEMPLATE, ...base]
  }, [activeCategory, templatesByCategory])

  const featuredOrder = useMemo(() => list.map((template) => template.id), [list])

  const filteredTemplates = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    let next = [...list]

    if (query) {
      next = next.filter((template) => {
        const inSections = (template.sections || []).some((section) => section.toLowerCase().includes(query))
        return (
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          inSections
        )
      })
    }

    if (favoritesOnly) {
      next = next.filter((template) => favorites.includes(template.id))
    }

    if (sortBy === "name-asc") {
      next.sort((first, second) => first.name.localeCompare(second.name))
    } else if (sortBy === "name-desc") {
      next.sort((first, second) => second.name.localeCompare(first.name))
    } else {
      next.sort((first, second) => featuredOrder.indexOf(first.id) - featuredOrder.indexOf(second.id))
    }

    return next
  }, [list, searchText, favoritesOnly, favorites, sortBy, featuredOrder])

  const selectedTemplateDef = useMemo(() => {
    const found = Object.values(templatesByCategory).flat().find((template) => template.id === selectedTemplate)
    return found || filteredTemplates[0] || list[0]
  }, [templatesByCategory, selectedTemplate, filteredTemplates, list])

  const toggleFavorite = (templateId: string) => {
    setFavorites((prev) => {
      if (prev.includes(templateId)) return prev.filter((id) => id !== templateId)
      return [...prev, templateId]
    })
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 p-4 sm:p-5 bg-gray-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search templates by name, section, or style..."
            className="w-full lg:flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          />
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "featured" | "name-asc" | "name-desc")}
              title="Sort templates"
              aria-label="Sort templates"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            >
              <option value="featured">Featured</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                favoritesOnly
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-gray-300 bg-white text-gray-600 hover:border-amber-300"
              }`}
            >
              ★ Favorites
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr,340px] min-h-[580px]">
        <aside className="border-r border-gray-200 bg-gray-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2 px-1">Categories</p>
          <div className="space-y-1">
            {categories.map((category) => {
              const isActive = category === activeCategory
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory?.(category)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 px-1">{filteredTemplates.length} template(s)</p>
        </aside>

        <div className="p-4 sm:p-5 overflow-y-auto border-r border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplate === template.id
              const isFav = favorites.includes(template.id)
              return (
                <div
                  key={template.id}
                  className={`rounded-xl border-2 overflow-hidden transition-all ${
                    isSelected
                      ? "border-blue-600 shadow-lg ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-blue-400 hover:shadow-md"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectTemplate(template.id)}
                    title={template.description}
                    className="w-full text-left"
                  >
                    <div className="relative aspect-[16/10] bg-gray-100">
                      <TemplateDivisionPreview sections={template.sections || []} />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                          {template.icon} {template.name}
                        </p>
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{activeCategory}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                    </div>
                  </button>
                  <div className="px-3 pb-2 bg-white">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(template.id)}
                      className={`text-xs font-medium ${isFav ? "text-amber-600" : "text-gray-400 hover:text-amber-600"}`}
                    >
                      {isFav ? "★ Favorited" : "☆ Add to favorites"}
                    </button>
                  </div>
                </div>
              )
            })}

            {filteredTemplates.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm font-medium text-gray-700">No templates match your current filters.</p>
                <p className="text-xs text-gray-500 mt-1">Try clearing search or turning off favorites filter.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="p-4 sm:p-5 bg-gray-50/50">
          {selectedTemplateDef ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Live Preview</h4>
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="relative aspect-[16/10] bg-gray-100">
                  <TemplateDivisionPreview sections={selectedTemplateDef.sections || []} />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900">{selectedTemplateDef.icon} {selectedTemplateDef.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedTemplateDef.description}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Sections Map</p>
                <div className="space-y-1.5">
                  {(selectedTemplateDef.sections || ["Nav", "Hero", "Content", "Footer"]).map((section, index) => (
                    <div key={`${selectedTemplateDef.id}-${index}`} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-sm ${section.toLowerCase().includes("footer") ? "bg-slate-800" : section.toLowerCase().includes("nav") ? "bg-slate-600" : section.toLowerCase().includes("hero") || section.toLowerCase().includes("banner") || section.toLowerCase().includes("header") ? "bg-blue-600" : section.toLowerCase().includes("price") || section.toLowerCase().includes("plan") ? "bg-orange-600" : section.toLowerCase().includes("gallery") || section.toLowerCase().includes("portfolio") ? "bg-pink-600" : section.toLowerCase().includes("contact") || section.toLowerCase().includes("booking") ? "bg-green-600" : section.toLowerCase().includes("feature") || section.toLowerCase().includes("service") ? "bg-indigo-600" : "bg-gray-500"}`} />
                      <span className="text-xs font-medium text-gray-700">{section}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
              <p className="text-sm font-medium text-gray-700">Choose a template to preview.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
