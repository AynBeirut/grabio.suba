"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DesignStylePicker } from "@/components/ui/design-style-picker"
import { OptionSelector } from "@/components/ui/option-selector"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CONTENT_TONES } from "@/components/ui/content-preferences"
import { Loader2 } from "lucide-react"
import { CategorySelector } from "@/components/ui/wizard/category-selector"
import { TemplateGrid } from "@/components/ui/wizard/template-grid"
import { StageBuilder } from "@/components/ui/wizard/stage-builder"
import { StageAssets } from "@/components/ui/wizard/stage-assets"
import { FooterStyleSelector } from "@/components/ui/wizard/footer-style-selector"
import { FooterPreview } from "@/components/ui/wizard/footer-style-selector"
import { NavPreview, NavStyleSelector } from "@/components/ui/wizard/nav-style-selector"
import { SiteMapPreview } from "@/components/ui/wizard/site-map-preview"
import { BASE_ASSET_ZONES, CUSTOM_TEMPLATE, FOOTER_STYLE_OPTIONS, WEBSITE_TEMPLATES, buildTemplateLayout } from "@/lib/wizard-config"
import { FONT_OPTIONS, getFontLabel } from "@/lib/font-options"

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [layoutSyncedTemplate, setLayoutSyncedTemplate] = useState<string>("")

  const [selectedDesignStyle, setSelectedDesignStyle] = useState<string>("business")
  const [selectedSections, setSelectedSections] = useState<string[]>(["hero", "about", "services", "contact"])
  const [selectedTone, setSelectedTone] = useState<string>("professional")
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [selectedFont, setSelectedFont] = useState<string>("ai-auto")
  const [selectedHero, setSelectedHero] = useState<string>("fullscreen")
  const [selectedStructure, setSelectedStructure] = useState<string>("single-page")
  const [selectedFooter, setSelectedFooter] = useState<string>("comprehensive")
  const [selectedMobile, setSelectedMobile] = useState<string>("mobile-first")

  const [selectedNavType, setSelectedNavType] = useState<string>("top-nav")
  const [pageCarousel, setPageCarousel] = useState<Record<string,number>>({})
  const [pageGallery, setPageGallery] = useState<Record<string,number>>({})
  const [pageNamesArray, setPageNamesArray] = useState<string[]>(["Home"])
  const [sectionPageMap] = useState<Record<string, string[]>>({})
  const [pageLayouts, setPageLayouts] = useState<Record<string, string[]>>({})
  const [pageSectionSizes, setPageSectionSizes] = useState<Record<string, string[]>>({})
  const [uploadPickerZone, setUploadPickerZone] = useState<{page: string; zone: string} | null>(null)
  const [serviceInput, setServiceInput] = useState("")
  const [pageNamingError, setPageNamingError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template: "blank",
    brandName: "",
    logo: "",
    images: [] as string[],
    mission: "",
    vision: "",
    aboutUs: "",
    servicesDescription: "",
    servicesList: [] as string[],
    phone: "",
    email: "",
    location: "",
    primaryColor: "#0056b3",
    brandColors: ["#0056b3"] as string[],
    facebook: "",
    twitter: "",
    linkedin: "",
    instagram: "",
    pageImages: {} as Record<string, Record<string, string>>,
    pageImageFileNames: {} as Record<string, Record<string, string>>,
    designStyle: "business",
    contentSections: ["hero", "about", "services", "contact"] as string[],
    contentTone: "professional",
    specialFeatures: [] as string[],
    fontFamily: "ai-auto",
    navigationStyle: "top-nav",
    heroLayout: "fullscreen",
    contentStructure: "single-page",
    footerStyle: "comprehensive",
    mobileLayout: "mobile-first",
  })

  const templates = WEBSITE_TEMPLATES
  const allTemplates = [...Object.values(templates).flat(), CUSTOM_TEMPLATE]

  const getTemplateLabel = (templateId: string): string => {
    return allTemplates.find((template) => template.id === templateId)?.name || 'Custom Template'
  }

  useEffect(() => {
    const loadProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}?excludeImages=1`)
        if (!res.ok) throw new Error("Failed to load project")
        const data = await res.json()

        const tplId = data.template || ""
        setSelectedTemplate(tplId)
        setLayoutSyncedTemplate(tplId)
        if (tplId === CUSTOM_TEMPLATE.id) setSelectedCategory("general")
        else if (templates.ecommerce.find((t: {id:string}) => t.id === tplId)) setSelectedCategory("ecommerce")
        else if (templates.business.find((t: {id:string}) => t.id === tplId)) setSelectedCategory("business")
        else if (templates.general.find((t: {id:string}) => t.id === tplId)) setSelectedCategory("general")

        if (data.designStyle) setSelectedDesignStyle(data.designStyle)
        if (data.contentSections?.length) setSelectedSections(data.contentSections)
        if (data.contentTone) setSelectedTone(data.contentTone)
        if (data.fontFamily) setSelectedFont(data.fontFamily)
        if (data.specialFeatures?.length) setSelectedFeatures(data.specialFeatures)
        if (data.navigationStyle && !data.navType) setSelectedNavType(data.navigationStyle)
        if (data.heroLayout) setSelectedHero(data.heroLayout)
        if (data.contentStructure) setSelectedStructure(data.contentStructure)
        if (data.footerStyle) setSelectedFooter(data.footerStyle)
        if (data.mobileLayout) setSelectedMobile(data.mobileLayout)
        if (data.navType) setSelectedNavType(data.navType)
        if (data.pageCarousel && typeof data.pageCarousel === 'object') setPageCarousel(data.pageCarousel)
        if (data.pageGallery && typeof data.pageGallery === 'object') setPageGallery(data.pageGallery)

        if (data.pageNames) {
          const names = data.pageNames.split(",").map((s: string) => s.trim()).filter(Boolean)
          if (names.length) setPageNamesArray(names)
        }
        if (data.pageLayouts) setPageLayouts(data.pageLayouts)
        if (data.pageSectionSizes) setPageSectionSizes(data.pageSectionSizes)

        const pageImageFileNames: Record<string, Record<string, string>> = {}
        if (data.pageImagePaths) {
          for (const [pg, secs] of Object.entries(data.pageImagePaths as Record<string, Record<string, string>>)) {
            pageImageFileNames[pg] = {}
            for (const [sec, path] of Object.entries(secs)) {
              pageImageFileNames[pg][sec] = path as string
            }
          }
        }

        setFormData({
          name: data.name || "",
          description: data.description || "",
          template: tplId || "blank",
          brandName: data.brandName || "",
          logo: data.logo || "",
          images: data.images || [],
          mission: data.mission || "",
          vision: data.vision || "",
          aboutUs: data.aboutUs || "",
          servicesDescription: data.servicesDescription || "",
          servicesList: data.servicesList || [],
          phone: data.phone || "",
          email: data.email || "",
          location: data.location || "",
          primaryColor: data.primaryColor || "#0056b3",
          brandColors: data.brandColors || [data.primaryColor || "#0056b3"],
          facebook: data.facebook || "",
          twitter: data.twitter || "",
          linkedin: data.linkedin || "",
          instagram: data.instagram || "",
          pageImages: data.pageImages || {},
          pageImageFileNames,
          designStyle: data.designStyle || "business",
          contentSections: data.contentSections || ["hero", "about", "services", "contact"],
          contentTone: data.contentTone || "professional",
          specialFeatures: data.specialFeatures || [],
          fontFamily: data.fontFamily || "ai-auto",
          navigationStyle: data.navType || data.navigationStyle || "top-nav",
          heroLayout: data.heroLayout || "fullscreen",
          contentStructure: data.contentStructure || "single-page",
          footerStyle: data.footerStyle || "comprehensive",
          mobileLayout: data.mobileLayout || "mobile-first",
        })

        const step = new URLSearchParams(window.location.search).get("step")
        if (step) {
          const n = parseInt(step, 10)
          if (n >= 1 && n <= 7) setCurrentStep(n)
        }
      } catch (error) {
        console.error("Error loading project:", error)
        router.push("/dashboard")
      } finally {
        setPageLoading(false)
      }
    }
    loadProject()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const resizeImage = (dataUrl: string, maxW = 600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) { resolve(dataUrl); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.65))
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setFormData({ ...formData, logo: reader.result as string })
      reader.readAsDataURL(file)
    }
  }

  const handleNext = () => { if (currentStep < 7) setCurrentStep(currentStep + 1) }
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep(currentStep - 1) }
  const handleCategorySelect = (category: string) => { setSelectedCategory(category) }
  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplateDef = allTemplates.find((template) => template.id === templateId)
    const generatedLayout = buildTemplateLayout(selectedTemplateDef?.sections || [])

    setSelectedTemplate(templateId)
    if (generatedLayout.contentSections.length > 0) setSelectedSections(generatedLayout.contentSections)
    setPageLayouts((previous) => ({ ...previous, Home: generatedLayout.pageLayouts }))
    setPageSectionSizes((previous) => ({ ...previous, Home: generatedLayout.pageSectionSizes }))
    setPageCarousel((previous) => ({ ...previous, Home: generatedLayout.carouselCount }))
    setPageGallery((previous) => ({ ...previous, Home: generatedLayout.galleryCount }))
    setLayoutSyncedTemplate(templateId)
    setFormData({ ...formData, template: templateId })
  }

  useEffect(() => {
    if (currentStep !== 5) return
    if (!selectedTemplate) return

    const selectedTemplateDef = allTemplates.find((template) => template.id === selectedTemplate)
    if (!selectedTemplateDef) return

    const generatedLayout = buildTemplateLayout(selectedTemplateDef.sections || [])
    const currentHomeLayout = pageLayouts.Home || []
    const expectedHasGroupedRows = generatedLayout.pageLayouts.some((token) => token.startsWith("row:"))
    const currentHasGroupedRows = currentHomeLayout.some((token) => token.startsWith("row:"))
    const shouldForceLegacyResync = expectedHasGroupedRows && !currentHasGroupedRows

    if (layoutSyncedTemplate === selectedTemplate && !shouldForceLegacyResync) return

    setPageLayouts((previous) => ({ ...previous, Home: generatedLayout.pageLayouts }))
    setPageSectionSizes((previous) => ({ ...previous, Home: generatedLayout.pageSectionSizes }))
    setPageCarousel((previous) => ({ ...previous, Home: generatedLayout.carouselCount }))
    setPageGallery((previous) => ({ ...previous, Home: generatedLayout.galleryCount }))
    if (generatedLayout.contentSections.length > 0) {
      setSelectedSections(generatedLayout.contentSections)
    }
    setLayoutSyncedTemplate(selectedTemplate)
  }, [currentStep, selectedTemplate, layoutSyncedTemplate, templates, pageLayouts.Home])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const userPages = pageNamesArray
      .map((name, index) => ({ index, value: name.trim() }))
      .filter((entry) => entry.index > 0)

    if (userPages.some((entry) => !entry.value)) {
      setCurrentStep(4)
      setPageNamingError("Please name all pages before continuing.")
      return
    }

    const seen = new Set<string>()
    for (const entry of userPages) {
      const key = entry.value.toLowerCase()
      if (seen.has(key)) {
        setCurrentStep(4)
        setPageNamingError("Page names must be unique. Please rename duplicates.")
        return
      }
      seen.add(key)
    }

    const normalizedPageNames = pageNamesArray.map((name, index) => (index === 0 ? "Home" : name.trim()))
    setLoading(true)
    try {
      const selectedTemplateDef = allTemplates.find((template) => template.id === selectedTemplate)
      const projectData = {
        ...formData,
        designStyle: selectedDesignStyle,
        contentSections: selectedSections,
        contentTone: selectedTone,
        specialFeatures: selectedFeatures,
        fontFamily: selectedFont,
        navigationStyle: selectedNavType,
        heroLayout: selectedHero,
        contentStructure: selectedStructure,
        footerStyle: selectedFooter,
        mobileLayout: selectedMobile,
        navType: selectedNavType,
        pageCarousel,
        pageGallery,
        template: selectedTemplate,
        category: selectedCategory,
        numberOfPages: String(normalizedPageNames.length),
        pageNames: normalizedPageNames.join(","),
        sectionPageMap,
        pageLayouts,
        pageSectionSizes,
        pageImages: formData.pageImages,
        brandColors: formData.brandColors,
        templateSections: selectedTemplateDef?.sections || [],
      }
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      })
      if (!res.ok) throw new Error("Failed to update project")
      sessionStorage.setItem(`wizard-updated-${projectId}`, "1")
      router.push(`/dashboard/projects/${projectId}`)
    } catch (error) {
      console.error("Error updating project:", error)
      setSaveError("Failed to save. Please try again.")
      setTimeout(() => setSaveError(""), 4000)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 7 helpers ────────────────────────────────────────────────────────
  const s7BaseZones = BASE_ASSET_ZONES
  const updatePageCount = (count: number) => {
    setPageNamingError("")
    setPageNamesArray(prev => {
      return Array(count).fill('').map((_, i) => {
        if (i === 0) return 'Home'
        const existing = prev[i]
        return (existing && existing.length > 0) ? existing : `Page ${i + 1}`
      })
    })
  }

  const s7UpdatePageName = (pi: number, newName: string) => {
    setPageNamingError("")
    setPageNamesArray(prev => {
      const next = [...prev]
      if (pi === 0) {
        next[pi] = "Home"
        return next
      }

      const oldName = next[pi]
      const rawName = newName ?? ""
      const safeName = rawName.trim()
      next[pi] = rawName

      if (!oldName || !safeName || oldName === safeName) {
        return next
      }

      setPageCarousel(prevCarousel => {
        if (prevCarousel[oldName] === undefined) return prevCarousel
        const nextCarousel = { ...prevCarousel, [safeName]: prevCarousel[oldName] }
        delete nextCarousel[oldName]
        return nextCarousel
      })

      setPageGallery(prevGallery => {
        if (prevGallery[oldName] === undefined) return prevGallery
        const nextGallery = { ...prevGallery, [safeName]: prevGallery[oldName] }
        delete nextGallery[oldName]
        return nextGallery
      })

      setPageLayouts(prevLayouts => {
        if (!prevLayouts[oldName]) return prevLayouts
        const nextLayouts = { ...prevLayouts, [safeName]: prevLayouts[oldName] }
        delete nextLayouts[oldName]
        return nextLayouts
      })

      setPageSectionSizes(prevSizes => {
        if (!prevSizes[oldName]) return prevSizes
        const nextSizes = { ...prevSizes, [safeName]: prevSizes[oldName] }
        delete nextSizes[oldName]
        return nextSizes
      })

      setFormData(fd => {
        const imgs = { ...fd.pageImages }
        const fns  = { ...fd.pageImageFileNames }
        if (imgs[oldName]) { imgs[safeName] = imgs[oldName]; delete imgs[oldName] }
        if (fns[oldName])  { fns[safeName]  = fns[oldName];  delete fns[oldName]  }
        return { ...fd, pageImages: imgs, pageImageFileNames: fns }
      })
      return next
    })
  }

  const removePage = (pageIndex: number) => {
    setPageNamingError("")
    if (pageIndex === 0) return

    setPageNamesArray((previous) => {
      if (pageIndex < 0 || pageIndex >= previous.length || previous.length <= 1) return previous

      const removedRaw = previous[pageIndex] ?? ""
      const removedKey = removedRaw.trim()
      const next = previous.filter((_, index) => index !== pageIndex)

      const cleanupMap = <T extends Record<string, unknown>>(source: T): T => {
        const nextMap = { ...source }
        delete nextMap[removedRaw]
        if (removedKey) delete nextMap[removedKey]
        return nextMap
      }

      setPageCarousel((previousCarousel) => cleanupMap(previousCarousel))
      setPageGallery((previousGallery) => cleanupMap(previousGallery))
      setPageLayouts((previousLayouts) => cleanupMap(previousLayouts))
      setPageSectionSizes((previousSizes) => cleanupMap(previousSizes))

      setFormData((fd) => {
        const nextImages = { ...fd.pageImages }
        const nextFileNames = { ...fd.pageImageFileNames }
        delete nextImages[removedRaw]
        delete nextFileNames[removedRaw]
        if (removedKey) {
          delete nextImages[removedKey]
          delete nextFileNames[removedKey]
        }
        return { ...fd, pageImages: nextImages, pageImageFileNames: nextFileNames }
      })

      return next
    })
  }

  const duplicatePage = (pageIndex: number) => {
    setPageNamingError("")

    setPageNamesArray((previous) => {
      if (pageIndex < 0 || pageIndex >= previous.length) return previous

      const sourceRaw = previous[pageIndex] ?? ""
      const sourceKey = sourceRaw.trim()
      const baseName = sourceKey || `Page ${pageIndex + 1}`

      const existing = new Set(previous.map((name) => name.trim().toLowerCase()))
      let candidate = `${baseName} Copy`
      let copyIndex = 2
      while (existing.has(candidate.trim().toLowerCase())) {
        candidate = `${baseName} Copy ${copyIndex}`
        copyIndex += 1
      }

      const pick = <T extends Record<string, unknown>>(source: T): unknown => {
        if (sourceKey && source[sourceKey] !== undefined) return source[sourceKey]
        return source[sourceRaw]
      }

      setPageCarousel((previousCarousel) => {
        const value = pick(previousCarousel)
        if (value === undefined) return previousCarousel
        return { ...previousCarousel, [candidate]: value as number }
      })

      setPageGallery((previousGallery) => {
        const value = pick(previousGallery)
        if (value === undefined) return previousGallery
        return { ...previousGallery, [candidate]: value as number }
      })

      setPageLayouts((previousLayouts) => {
        const value = pick(previousLayouts)
        if (value === undefined) return previousLayouts
        return { ...previousLayouts, [candidate]: value as string[] }
      })

      setPageSectionSizes((previousSizes) => {
        const value = pick(previousSizes)
        if (value === undefined) return previousSizes
        return { ...previousSizes, [candidate]: value as string[] }
      })

      setFormData((fd) => {
        const sourceImages = (sourceKey && fd.pageImages[sourceKey]) ? fd.pageImages[sourceKey] : fd.pageImages[sourceRaw]
        const sourceFileNames = (sourceKey && fd.pageImageFileNames[sourceKey]) ? fd.pageImageFileNames[sourceKey] : fd.pageImageFileNames[sourceRaw]
        return {
          ...fd,
          pageImages: sourceImages ? { ...fd.pageImages, [candidate]: { ...sourceImages } } : fd.pageImages,
          pageImageFileNames: sourceFileNames ? { ...fd.pageImageFileNames, [candidate]: { ...sourceFileNames } } : fd.pageImageFileNames,
        }
      })

      return [...previous, candidate]
    })
  }

  const s7UploadFile = async (file: File, pageName: string, zone: string) => {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const compressed = await resizeImage(reader.result as string)
      setFormData(prev => ({
        ...prev,
        pageImages: { ...prev.pageImages, [pageName]: { ...(prev.pageImages?.[pageName] || {}), [zone]: compressed } },
        pageImageFileNames: { ...prev.pageImageFileNames, [pageName]: { ...(prev.pageImageFileNames?.[pageName] || {}), [zone]: file.name } },
      }))
    }
    reader.readAsDataURL(file)
  }

  const s7RemoveAsset = (pageName: string, zone: string) => {
    setFormData(prev => {
      const imgs = { ...prev.pageImages }
      const fns = { ...prev.pageImageFileNames }
      if (imgs[pageName]) {
        const nextPageImages = { ...imgs[pageName] }
        delete nextPageImages[zone]
        imgs[pageName] = nextPageImages
      }
      if (fns[pageName]) {
        const nextPageFileNames = { ...fns[pageName] }
        delete nextPageFileNames[zone]
        fns[pageName] = nextPageFileNames
      }
      return { ...prev, pageImages: imgs, pageImageFileNames: fns }
    })
  }

  const getReadableLayoutRows = (pageName: string): string[] => {
    const rows = pageLayouts?.[pageName] || []
    if (!rows.length) return []
    return rows.map((token) => {
      if (token.startsWith("row:")) {
        return token
          .slice(4)
          .split("|")
          .map((value) => value.trim())
          .filter(Boolean)
          .join(" + ")
      }
      return token
    })
  }

  const homeLayoutRows = getReadableLayoutRows("Home")

  const logoPreviewSrc =
    formData.logo?.startsWith("data:") ||
    formData.logo?.startsWith("http://") ||
    formData.logo?.startsWith("https://")
      ? formData.logo
      : ""

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 py-4 sm:py-0">
      {saveError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-4 py-2 rounded-xl shadow-xl">
          {saveError}
        </div>
      )}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Project</h1>
        <p className="text-muted-foreground mt-2">Update your project information and settings</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center space-x-2 mb-8 overflow-x-auto px-4">
        {[
          { n: 1, label: "Info" },
          { n: 2, label: "Template" },
          { n: 3, label: "Style" },
          { n: 4, label: "Navigation & Pages" },
          { n: 5, label: "Stage Builder" },
          { n: 6, label: "Assets" },
          { n: 7, label: "Save" },
        ].map(({ n, label }, idx, arr) => (
          <div key={n} className="flex items-center">
            <div className={`flex items-center ${currentStep >= n ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm ${currentStep >= n ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}>{n}</div>
              <span className="ml-1 font-medium text-sm hidden sm:inline">{label}</span>
            </div>
            {idx < arr.length - 1 && <div className={`w-4 h-1 mx-1 ${currentStep > n ? "bg-blue-600" : "bg-gray-300"}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Step 1 ── */}
        {currentStep === 1 && (
          <>
            <Card>
              <CardHeader><CardTitle>Project Details</CardTitle><CardDescription>Update your project name and description</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input id="name" placeholder="My Awesome Website" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="A brief description of your project..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Brand Information</CardTitle><CardDescription>Tell us about your brand and business</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input id="brandName" placeholder="Your Company Name" value={formData.brandName} onChange={(e) => setFormData({ ...formData, brandName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Brand Colors <span className="text-gray-400 font-normal text-xs">(primary first)</span></Label>
                    {formData.brandColors.length < 6 && (
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, brandColors: [...prev.brandColors, "#cccccc"] }))}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-500 rounded-lg px-2.5 py-1 transition-colors">
                        + Add Color
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {formData.brandColors.map((color, ci) => (
                      <div key={ci} className="relative flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-2">
                        <input type="color" value={color}
                          title={ci === 0 ? 'Primary color' : `Color ${ci + 1}`}
                          onChange={e => setFormData(prev => { const c = [...prev.brandColors]; c[ci] = e.target.value; return { ...prev, brandColors: c, ...(ci === 0 ? { primaryColor: e.target.value } : {}) } })}
                          className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0" />
                        <input type="text" value={color} maxLength={7}
                          title={ci === 0 ? 'Primary color hex' : `Color ${ci + 1} hex`}
                          placeholder="#0056b3"
                          onChange={e => setFormData(prev => { const c = [...prev.brandColors]; c[ci] = e.target.value; return { ...prev, brandColors: c, ...(ci === 0 ? { primaryColor: e.target.value } : {}) } })}
                          className="w-20 text-xs font-mono border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white" />
                        <span className="text-[10px] text-gray-400 font-medium">{ci === 0 ? "Primary" : ci === 1 ? "Secondary" : ci === 2 ? "Accent" : `Color ${ci+1}`}</span>
                        {formData.brandColors.length > 1 && (
                          <button type="button" onClick={() => setFormData(prev => { const c = prev.brandColors.filter((_, i) => i !== ci); return { ...prev, brandColors: c, primaryColor: c[0] || "#0056b3" } })}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 leading-none">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo">Brand Logo</Label>
                  <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="cursor-pointer" />
                  {formData.logo && (
                    <div className="mt-2 relative inline-block">
                      {logoPreviewSrc ? (
                        <Image src={logoPreviewSrc} alt="Logo preview" width={160} height={80} className="h-20 w-auto border rounded" unoptimized />
                      ) : (
                        <div className="h-20 w-full sm:min-w-40 px-3 border rounded bg-gray-50 text-xs text-gray-500 flex items-center">Saved logo path: {formData.logo}</div>
                      )}
                      <button type="button" onClick={() => setFormData({ ...formData, logo: "" })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">×</button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Company Information</CardTitle><CardDescription>Tell us about your company</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="mission">Mission</Label><Textarea id="mission" placeholder="What is your company&apos;s mission?" value={formData.mission} onChange={(e) => setFormData({ ...formData, mission: e.target.value })} rows={3} /></div>
                <div className="space-y-2"><Label htmlFor="vision">Vision</Label><Textarea id="vision" placeholder="What is your company&apos;s vision?" value={formData.vision} onChange={(e) => setFormData({ ...formData, vision: e.target.value })} rows={3} /></div>
                <div className="space-y-2"><Label htmlFor="aboutUs">About Us</Label><Textarea id="aboutUs" placeholder="Tell us about your company..." value={formData.aboutUs} onChange={(e) => setFormData({ ...formData, aboutUs: e.target.value })} rows={5} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Our Services</CardTitle><CardDescription>What services or products do you offer?</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="servicesDescription">Services Overview</Label><Textarea id="servicesDescription" placeholder="Describe the main services or products you offer..." value={formData.servicesDescription} onChange={(e) => setFormData({ ...formData, servicesDescription: e.target.value })} rows={3} /></div>
                <div className="space-y-2">
                  <Label>Individual Services <span className="text-gray-400 font-normal text-xs">(press Enter to add)</span></Label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Web Design, SEO…" value={serviceInput} onChange={e => setServiceInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && serviceInput.trim()) { e.preventDefault(); const val = serviceInput.trim(); if (val && !formData.servicesList.includes(val)) setFormData(prev => ({ ...prev, servicesList: [...prev.servicesList, val] })); setServiceInput("") } }} />
                    <Button type="button" variant="outline" onClick={() => { const val = serviceInput.trim(); if (val && !formData.servicesList.includes(val)) setFormData(prev => ({ ...prev, servicesList: [...prev.servicesList, val] })); setServiceInput("") }}>Add</Button>
                  </div>
                  {formData.servicesList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.servicesList.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-1 rounded-full">
                          {s}
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, servicesList: prev.servicesList.filter((_, idx) => idx !== i) }))} className="text-blue-400 hover:text-blue-700 font-bold leading-none ml-1">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" placeholder="contact@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="location">Business Location</Label><Input id="location" placeholder="123 Main St, City, Country" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Social Media Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="facebook">Facebook URL</Label><Input id="facebook" placeholder="https://facebook.com/yourpage" value={formData.facebook} onChange={(e) => setFormData({ ...formData, facebook: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="twitter">Twitter URL</Label><Input id="twitter" placeholder="https://twitter.com/yourhandle" value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="linkedin">LinkedIn URL</Label><Input id="linkedin" placeholder="https://linkedin.com/company/yourcompany" value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="instagram">Instagram URL</Label><Input id="instagram" placeholder="https://instagram.com/yourhandle" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Category</CardTitle>
                <CardDescription>Pick your business type here so template suggestions are accurate.</CardDescription>
              </CardHeader>
              <CardContent>
                <CategorySelector selectedCategory={selectedCategory} onSelect={handleCategorySelect} />
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-between gap-4">
              <Button type="button" variant="outline" size="lg" onClick={() => router.push(`/dashboard/projects/${projectId}`)}>Cancel</Button>
              <Button type="button" size="lg" onClick={handleNext} disabled={!formData.name || !selectedCategory}>Save & Continue →</Button>
            </div>
          </>
        )}

        {/* ── Step 2 ── */}
        {currentStep === 2 && (
          <>
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {logoPreviewSrc && <Image src={logoPreviewSrc} alt="Logo" width={48} height={48} className="h-12 w-12 object-contain rounded border" unoptimized />}
                  <div>
                    <h3 className="font-semibold text-gray-900">{formData.name || "Your Project"}</h3>
                    <p className="text-sm text-gray-600">{formData.brandName && `${formData.brandName} • `}Category: <span className="font-medium capitalize">{selectedCategory}</span></p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(1)}>✏️ Edit Details</Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Choose Your Template</h2>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Browse and select from our {selectedCategory} templates</p>
                  {selectedCategory && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setCurrentStep(1); setSelectedTemplate("") }}>Change Category</Button>
                  )}
                </div>
              </div>

              <TemplateGrid
                templatesByCategory={templates}
                selectedCategory={selectedCategory}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={handleTemplateSelect}
                onSelectCategory={setSelectedCategory}
              />

            </div>

            <div className="flex flex-wrap justify-between items-center gap-4 pt-6">
              <Button type="button" variant="outline" size="lg" onClick={handlePrevious} className="px-4 sm:px-8">← Back to Info</Button>
              <div className="flex items-center gap-3">
                {selectedTemplate && <span className="hidden sm:block text-sm text-gray-600">Selected: <span className="font-semibold text-blue-600">{getTemplateLabel(selectedTemplate)}</span></span>}
                <Button type="button" size="lg" onClick={handleNext} className="px-4 sm:px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800" disabled={!selectedTemplate}>
                  Continue to Style →
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3 ── */}
        {currentStep === 3 && (
          <Card className="p-4 sm:p-8">
            <DesignStylePicker selectedStyle={selectedDesignStyle} onStyleChange={setSelectedDesignStyle} className="mb-6" brandColors={formData.brandColors} />

            <div className="mb-6 pt-6 border-t">
              <OptionSelector
                title="🎯 Content Tone & Style"
                options={CONTENT_TONES}
                selectedOptions={selectedTone ? [selectedTone] : []}
                onSelectionChange={(tones) => setSelectedTone(tones[0] || "")}
                multiSelect={false}
              />
              <p className="text-sm text-gray-500 mt-2">
                Choose the writing style and tone for your website content.
              </p>
            </div>

            <div className="mb-6 pt-6 border-t">
              <h3 className="text-base font-bold text-gray-900 mb-1">🔤 Font Family</h3>
              <p className="text-sm text-gray-500 mb-3">Choose your preferred font, or let AI pick the best match for your design.</p>
              <Select value={selectedFont} onValueChange={setSelectedFont}>
                <SelectTrigger className="w-full max-w-[420px]">
                  <SelectValue placeholder="Choose a font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>AI</SelectLabel>
                    {FONT_OPTIONS.filter((font) => font.category === "AI").map((font) => (
                      <SelectItem key={font.id} value={font.id}>{font.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Sans Serif</SelectLabel>
                    {FONT_OPTIONS.filter((font) => font.category === "Sans").map((font) => (
                      <SelectItem key={font.id} value={font.id}>{font.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Serif</SelectLabel>
                    {FONT_OPTIONS.filter((font) => font.category === "Serif").map((font) => (
                      <SelectItem key={font.id} value={font.id}>{font.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Display</SelectLabel>
                    {FONT_OPTIONS.filter((font) => font.category === "Display").map((font) => (
                      <SelectItem key={font.id} value={font.id}>{font.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Monospace</SelectLabel>
                    {FONT_OPTIONS.filter((font) => font.category === "Mono").map((font) => (
                      <SelectItem key={font.id} value={font.id}>{font.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">Selected: <span className="font-semibold text-gray-700">{getFontLabel(selectedFont)}</span></p>
            </div>

            <div className="flex flex-wrap justify-between items-center pt-6 border-t">
              <Button type="button" variant="outline" size="lg" onClick={handlePrevious} className="px-4 sm:px-8">← Back to Templates</Button>
              <Button type="button" size="lg" onClick={handleNext} className="px-4 sm:px-8" disabled={!selectedDesignStyle || !selectedTone}>Continue to Navigation & Pages →</Button>
            </div>
          </Card>
        )}

        {/* ── Step 4 ── */}
        {currentStep === 4 && (
          <Card className="p-4 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Navigation & Pages Setup</h2>
              <p className="text-gray-500 text-sm mt-1">Set how visitors navigate and define your page list before arranging row layouts.</p>
            </div>

            <NavStyleSelector selectedNavType={selectedNavType} onChange={setSelectedNavType} />

            <FooterStyleSelector
              selectedFooterStyle={selectedFooter}
              onChange={setSelectedFooter}
            />

            <div className="mt-6 pt-6 border-t">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Pages</label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => updatePageCount(Math.max(1, pageNamesArray.length - 1))}
                  className="h-10 px-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 font-semibold"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={pageNamesArray.length}
                  title="Number of pages"
                  aria-label="Number of pages"
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    if (!Number.isFinite(parsed)) return
                    updatePageCount(Math.max(1, Math.floor(parsed)))
                  }}
                  className="h-10 w-24 border-2 border-blue-300 rounded-xl px-3 text-sm font-semibold focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => updatePageCount(pageNamesArray.length + 1)}
                  className="h-10 px-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 font-semibold"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => updatePageCount(pageNamesArray.length + 1)}
                  className="h-10 px-4 rounded-xl border-2 border-blue-300 text-blue-700 hover:border-blue-500 hover:bg-blue-50 text-sm font-semibold"
                >
                  + Add Page
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {pageNamesArray.map((pageName, pageIndex) => {
                const isFirst = pageIndex === 0
                return (
                  <div key={pageIndex} className="flex items-center gap-3 flex-wrap p-3 rounded-xl border border-gray-200 bg-gray-50">
                    <span className="inline-flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 min-w-[60px]">
                      Page {pageIndex + 1}
                    </span>
                    {isFirst ? (
                      <span className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-500">🔒 Home</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={pageName}
                          onChange={(event) => s7UpdatePageName(pageIndex, event.target.value)}
                          className="border-2 border-blue-300 rounded-lg px-3 py-1.5 text-sm font-semibold w-full sm:min-w-[220px] sm:w-auto flex-1 focus:outline-none focus:border-blue-600 bg-white"
                          placeholder={`Enter page name (Page ${pageIndex + 1})`}
                        />
                        <button
                          type="button"
                          onClick={() => duplicatePage(pageIndex)}
                          className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => removePage(pageIndex)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {pageNamingError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {pageNamingError}
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center pt-6 border-t mt-6">
              <Button type="button" variant="outline" size="lg" onClick={handlePrevious} className="px-4 sm:px-8">← Back to Style</Button>
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  const userPages = pageNamesArray
                    .map((name, index) => ({ index, value: name.trim() }))
                    .filter((entry) => entry.index > 0)

                  if (userPages.some((entry) => !entry.value)) {
                    setPageNamingError("Please name all pages before continuing.")
                    return
                  }

                  const seen = new Set<string>()
                  for (const entry of userPages) {
                    const key = entry.value.toLowerCase()
                    if (seen.has(key)) {
                      setPageNamingError("Page names must be unique. Please rename duplicates.")
                      return
                    }
                    seen.add(key)
                  }

                  setPageNamingError("")
                  handleNext()
                }}
                className="px-4 sm:px-8"
              >
                Continue to Stage Builder →
              </Button>
            </div>
          </Card>
        )}

        {/* ── Step 5 ── */}
        {currentStep === 5 && (
          <Card className="p-4 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Scratch Stage Builder</h2>
              <p className="text-gray-500 text-sm mt-1">Build page-by-page: choose menu type, add blocks (including Carousel/Gallery), reorder blocks, and set each block size.</p>
            </div>
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Reflected from Steps 3 & 4</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Design Style:</span>
                  <div className="font-medium text-blue-900">{selectedDesignStyle}</div>
                </div>
                <div>
                  <span className="text-blue-700">Content Tone:</span>
                  <div className="font-medium text-blue-900">{selectedTone}</div>
                </div>
                <div>
                  <span className="text-blue-700">Font:</span>
                  <div className="font-medium text-blue-900">{getFontLabel(selectedFont)}</div>
                </div>
                <div>
                  <span className="text-blue-700">Navigation:</span>
                  <div className="font-medium text-blue-900">{selectedNavType}</div>
                </div>
                <div>
                  <span className="text-blue-700">Footer:</span>
                  <div className="font-medium text-blue-900">{FOOTER_STYLE_OPTIONS.find((option) => option.id === selectedFooter)?.label || selectedFooter}</div>
                </div>
                <div>
                  <span className="text-blue-700">Pages:</span>
                  <div className="font-medium text-blue-900">{pageNamesArray.length}</div>
                </div>
              </div>
            </div>
            <StageBuilder
              pageNames={pageNamesArray}
              selectedNavType={selectedNavType}
              selectedSections={selectedSections}
              selectedTone={selectedTone}
              selectedFeatures={selectedFeatures}
              selectedHeroLayout={selectedHero}
              selectedContentStructure={selectedStructure}
              selectedFooterStyle={selectedFooter}
              selectedMobileLayout={selectedMobile}
              onPageCountChange={updatePageCount}
              onNavTypeChange={setSelectedNavType}
              onSectionsChange={setSelectedSections}
              onToneChange={setSelectedTone}
              onFeaturesChange={setSelectedFeatures}
              onHeroLayoutChange={setSelectedHero}
              onContentStructureChange={setSelectedStructure}
              onFooterStyleChange={setSelectedFooter}
              onMobileLayoutChange={setSelectedMobile}
              onPageNameChange={s7UpdatePageName}
              pageLayouts={pageLayouts}
              pageSectionSizes={pageSectionSizes}
              pageCarousel={pageCarousel}
              pageGallery={pageGallery}
              onPageLayoutsChange={setPageLayouts}
              onPageSectionSizesChange={setPageSectionSizes}
              onPageCarouselChange={setPageCarousel}
              onPageGalleryChange={setPageGallery}
              previewPrimaryColor={formData.brandColors?.[0] || formData.primaryColor}
            />
            <div className="flex flex-wrap justify-between items-center pt-6 border-t">
              <Button type="button" variant="outline" size="lg" onClick={handlePrevious} className="px-4 sm:px-8">← Back to Navigation & Pages</Button>
              <Button type="button" size="lg" onClick={handleNext} className="px-4 sm:px-8" disabled={selectedSections.length === 0 || !selectedTone}>Continue to Assets →</Button>
            </div>
          </Card>
        )}

        {/* ── Step 6 ── */}
        {currentStep === 6 && (
          <Card className="p-6 sm:p-8">
            <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4">
              <h4 className="font-semibold text-purple-900 mb-2">Reflected from Stage Builder (Step 5)</h4>
              <div className="space-y-2 text-sm text-purple-900">
                <div><span className="text-purple-700">Navigation:</span> <span className="font-medium">{selectedNavType}</span></div>
                <div><span className="text-purple-700">Pages:</span> <span className="font-medium">{pageNamesArray.join(', ')}</span></div>
                <div>
                  <span className="text-purple-700">Home Layout Rows:</span>
                  <div className="font-medium mt-1">{homeLayoutRows.length ? homeLayoutRows.join(' → ') : 'Will use default template rows'}</div>
                </div>
              </div>
            </div>

            <StageAssets
              pageNames={pageNamesArray}
              baseZones={s7BaseZones}
              pageCarousel={pageCarousel}
              pageGallery={pageGallery}
              pageImages={formData.pageImages}
              pageImageFileNames={formData.pageImageFileNames}
              uploadPickerZone={uploadPickerZone}
              setUploadPickerZone={setUploadPickerZone}
              onUploadFile={s7UploadFile}
              onRemoveAsset={s7RemoveAsset}
            />

            <div className="flex flex-wrap justify-between items-center pt-6 mt-6 border-t gap-4">
              <Button type="button" variant="outline" size="lg" onClick={handlePrevious} className="px-4 sm:px-8">← Back to Stage Builder</Button>
              <Button type="button" size="lg" onClick={handleNext} className="px-4 sm:px-8 bg-blue-600 hover:bg-blue-700 text-white">Continue to Review →</Button>
            </div>
          </Card>
        )}

        {/* ── Step 7 ── */}
        {currentStep === 7 && (
          <Card className="p-4 sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review &amp; Save Changes</h2>
              <p className="text-gray-600">Review your selections below and save to update your website.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">🎨 Design Foundation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-blue-700">Template:</span><span className="font-medium text-blue-900">{Object.values(templates).flat().find(t => t.id === selectedTemplate)?.name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-blue-700">Design Style:</span><span className="font-medium text-blue-900">{selectedDesignStyle}</span></div>
                    <div className="flex justify-between"><span className="text-blue-700">Content Tone:</span><span className="font-medium text-blue-900">{selectedTone}</span></div>
                    <div className="flex justify-between"><span className="text-blue-700">Font:</span><span className="font-medium text-blue-900">{getFontLabel(selectedFont)}</span></div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3">📄 Content & Features</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-green-700">Sections ({selectedSections.length}):</span><div className="mt-1 text-green-900 font-medium">{selectedSections.slice(0,4).join(", ")}{selectedSections.length > 4 && `, +${selectedSections.length - 4} more`}</div></div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-3">🧱 Stage Structure</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-purple-700">Navigation:</span><span className="font-medium text-purple-900">{selectedNavType}</span></div>
                    <div className="flex justify-between"><span className="text-purple-700">Hero Style:</span><span className="font-medium text-purple-900">{selectedHero}</span></div>
                    <div className="flex justify-between"><span className="text-purple-700">Pages:</span><span className="font-medium text-purple-900">{pageNamesArray.length} ({pageNamesArray.join(", ")})</span></div>
                    <div>
                      <span className="text-purple-700">Home Layout:</span>
                      <div className="mt-1 text-purple-900 font-medium break-words">
                        {homeLayoutRows.length ? homeLayoutRows.join(' → ') : 'Default template layout'}
                      </div>
                    </div>
                    <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-purple-200 bg-white p-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-2">Menu Preview</div>
                        <NavPreview id={selectedNavType} active={true} />
                      </div>
                      <div className="rounded-xl border border-purple-200 bg-white p-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-2">Footer Preview</div>
                        <FooterPreview id={selectedFooter} active={true} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-3">🏷️ Brand</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-amber-700">Project:</span><span className="font-medium text-amber-900">{formData.name}</span></div>
                    {formData.brandName && <div className="flex justify-between"><span className="text-amber-700">Brand:</span><span className="font-medium text-amber-900">{formData.brandName}</span></div>}
                    <div className="flex justify-between items-center"><span className="text-amber-700">Primary Color:</span><div className="flex items-center gap-2"><div className="px-2 py-0.5 rounded-md border border-amber-300 bg-white text-[11px] font-mono text-amber-900">HEX</div><span className="font-medium text-amber-900">{formData.primaryColor}</span></div></div>
                  </div>
                </div>
              </div>
            </div>

            <SiteMapPreview pageNames={pageNamesArray} getReadableLayoutRows={getReadableLayoutRows} />

            <div className="flex flex-wrap justify-between items-center gap-4 pt-6 border-t">
              <Button type="button" variant="outline" size="lg" onClick={handlePrevious} className="px-4 sm:px-8">← Back to Assets</Button>
              <Button type="submit" size="lg" className="px-4 sm:px-8 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving...</> : <>💾 Save Changes</>}
              </Button>
            </div>
          </Card>
        )}

      </form>
    </div>
  )
}
