"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DesignStylePicker } from "@/components/ui/design-style-picker"
import { OptionSelector } from "@/components/ui/option-selector"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CONTENT_TONES } from "@/components/ui/content-preferences"
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

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [layoutSyncedTemplate, setLayoutSyncedTemplate] = useState<string>("")
  const [useAI, setUseAI] = useState(false)
  
  // New option selection states
  const [selectedDesignStyle, setSelectedDesignStyle] = useState<string>("business")
  const [selectedSections, setSelectedSections] = useState<string[]>(["hero", "about", "services", "contact"])
  const [selectedTone, setSelectedTone] = useState<string>("professional")
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [selectedFont, setSelectedFont] = useState<string>("ai-auto")

  // New wizard state
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
    // Option selections
    designStyle: "business",
    contentSections: ["hero", "about", "services", "contact"] as string[],
    contentTone: "professional",
    specialFeatures: [] as string[],
    fontFamily: "ai-auto",
    navigationStyle: "top-nav",
    heroLayout: "fullscreen",
    contentStructure: "single-page",
    footerStyle: "comprehensive",
    mobileLayout: "mobile-first"
  })

  const templates = WEBSITE_TEMPLATES
  const allTemplates = [...Object.values(templates).flat(), CUSTOM_TEMPLATE]

  const getTemplateLabel = (templateId: string): string => {
    return allTemplates.find((template) => template.id === templateId)?.name || 'Custom Template'
  }

  const resizeImage = (dataUrl: string, maxW = 600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(dataUrl); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.65))
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
  }

  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplateDef = allTemplates.find((template) => template.id === templateId)
    const generatedLayout = buildTemplateLayout(selectedTemplateDef?.sections || [])

    setSelectedTemplate(templateId)
    setSelectedSections((previous) => (generatedLayout.contentSections.length > 0 ? generatedLayout.contentSections : previous))
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

  const handleAIRecommendation = () => {
    // AI Logic: Analyze business type and info to recommend template
    const businessInfo = (formData.aboutUs + " " + formData.mission + " " + formData.description).toLowerCase()
    
    // E-commerce indicators
    if (businessInfo.includes("shop") || businessInfo.includes("store") || businessInfo.includes("product") || 
        businessInfo.includes("sell") || businessInfo.includes("buy") || businessInfo.includes("ecommerce") ||
        businessInfo.includes("e-commerce") || businessInfo.includes("retail") || businessInfo.includes("marketplace")) {
      const ecommerceTemplates = templates.ecommerce
      // Smart matching for specific store types
      if (businessInfo.includes("fashion") || businessInfo.includes("clothing")) {
        setSelectedTemplate("fashion-store")
        setFormData({ ...formData, template: "fashion-store" })
      } else if (businessInfo.includes("electronic") || businessInfo.includes("tech") || businessInfo.includes("gadget")) {
        setSelectedTemplate("electronics-shop")
        setFormData({ ...formData, template: "electronics-shop" })
      } else if (businessInfo.includes("grocery") || businessInfo.includes("food")) {
        setSelectedTemplate("grocery-store")
        setFormData({ ...formData, template: "grocery-store" })
      } else if (businessInfo.includes("jewelry") || businessInfo.includes("jewellery")) {
        setSelectedTemplate("jewelry-shop")
        setFormData({ ...formData, template: "jewelry-shop" })
      } else if (businessInfo.includes("book")) {
        setSelectedTemplate("bookstore")
        setFormData({ ...formData, template: "bookstore" })
      } else if (businessInfo.includes("furniture")) {
        setSelectedTemplate("furniture-store")
        setFormData({ ...formData, template: "furniture-store" })
      } else if (businessInfo.includes("pet")) {
        setSelectedTemplate("pet-store")
        setFormData({ ...formData, template: "pet-store" })
      } else {
        const recommended = ecommerceTemplates[Math.floor(Math.random() * ecommerceTemplates.length)]
        setSelectedTemplate(recommended.id)
        setFormData({ ...formData, template: recommended.id })
      }
      setSelectedCategory("ecommerce")
      return
    }
    
    // Business/Service indicators - specific matches
    if (businessInfo.includes("restaurant") || businessInfo.includes("cafe") || businessInfo.includes("dining")) {
      setSelectedTemplate("restaurant")
      setFormData({ ...formData, template: "restaurant" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("construction") || businessInfo.includes("contractor") || businessInfo.includes("builder") ||
        businessInfo.includes("building") || businessInfo.includes("renovation")) {
      setSelectedTemplate("construction")
      setFormData({ ...formData, template: "construction" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("salon") || businessInfo.includes("spa") || businessInfo.includes("beauty")) {
      setSelectedTemplate("salon-spa")
      setFormData({ ...formData, template: "salon-spa" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("real estate") || businessInfo.includes("property") || businessInfo.includes("realtor")) {
      setSelectedTemplate("real-estate")
      setFormData({ ...formData, template: "real-estate" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("gym") || businessInfo.includes("fitness") || businessInfo.includes("workout")) {
      setSelectedTemplate("gym-fitness")
      setFormData({ ...formData, template: "gym-fitness" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("medical") || businessInfo.includes("clinic") || businessInfo.includes("hospital") || businessInfo.includes("health")) {
      setSelectedTemplate("medical-clinic")
      setFormData({ ...formData, template: "medical-clinic" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("dental") || businessInfo.includes("dentist")) {
      setSelectedTemplate("dental-clinic")
      setFormData({ ...formData, template: "dental-clinic" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("law") || businessInfo.includes("legal") || businessInfo.includes("attorney") || businessInfo.includes("lawyer")) {
      setSelectedTemplate("law-firm")
      setFormData({ ...formData, template: "law-firm" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("auto") || businessInfo.includes("car repair") || businessInfo.includes("mechanic")) {
      setSelectedTemplate("auto-repair")
      setFormData({ ...formData, template: "auto-repair" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("photography") || businessInfo.includes("photographer")) {
      setSelectedTemplate("photography")
      setFormData({ ...formData, template: "photography" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("hotel") || businessInfo.includes("resort") || businessInfo.includes("accommodation")) {
      setSelectedTemplate("hotel")
      setFormData({ ...formData, template: "hotel" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("cleaning")) {
      setSelectedTemplate("cleaning-service")
      setFormData({ ...formData, template: "cleaning-service" })
      setSelectedCategory("business")
      return
    }
    if (businessInfo.includes("catering")) {
      setSelectedTemplate("catering")
      setFormData({ ...formData, template: "catering" })
      setSelectedCategory("business")
      return
    }
    
    // General business services
    if (businessInfo.includes("service") || businessInfo.includes("business") || businessInfo.includes("professional")) {
      const businessTemplates = templates.business
      const recommended = businessTemplates[Math.floor(Math.random() * businessTemplates.length)]
      setSelectedTemplate(recommended.id)
      setFormData({ ...formData, template: recommended.id })
      setSelectedCategory("business")
      return
    }
    
    // General purpose - portfolio, blog, etc
    if (businessInfo.includes("portfolio") || businessInfo.includes("creative") || businessInfo.includes("artist")) {
      setSelectedTemplate("portfolio")
      setFormData({ ...formData, template: "portfolio" })
      setSelectedCategory("general")
      return
    }
    if (businessInfo.includes("blog") || businessInfo.includes("writer") || businessInfo.includes("journalist")) {
      setSelectedTemplate("blog")
      setFormData({ ...formData, template: "blog" })
      setSelectedCategory("general")
      return
    }
    if (businessInfo.includes("saas") || businessInfo.includes("software") || businessInfo.includes("app")) {
      setSelectedTemplate("saas")
      setFormData({ ...formData, template: "saas" })
      setSelectedCategory("general")
      return
    }
    if (businessInfo.includes("nonprofit") || businessInfo.includes("charity") || businessInfo.includes("donation")) {
      setSelectedTemplate("nonprofit")
      setFormData({ ...formData, template: "nonprofit" })
      setSelectedCategory("general")
      return
    }
    if (businessInfo.includes("education") || businessInfo.includes("learning") || businessInfo.includes("course")) {
      setSelectedTemplate("education")
      setFormData({ ...formData, template: "education" })
      setSelectedCategory("general")
      return
    }
    
    // Default to landing page
    setSelectedTemplate("landing-page")
    setFormData({ ...formData, template: "landing-page" })
    setSelectedCategory("general")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validatePageNames = (): string | null => {
      const userPages = pageNamesArray
        .map((name, index) => ({ index, value: name.trim() }))
        .filter((entry) => entry.index > 0)

      if (userPages.some((entry) => !entry.value)) {
        return "Please name all pages before continuing."
      }

      const seen = new Set<string>()
      for (const entry of userPages) {
        const key = entry.value.toLowerCase()
        if (seen.has(key)) {
          return "Page names must be unique. Please rename duplicates."
        }
        seen.add(key)
      }

      return null
    }

    const pageError = validatePageNames()
    if (pageError) {
      setCurrentStep(4)
      setPageNamingError(pageError)
      return
    }

    const normalizedPageNames = pageNamesArray.map((name, index) => (index === 0 ? "Home" : name.trim()))
    setLoading(true)

    try {
      const selectedTemplateDef = allTemplates.find(t => t.id === selectedTemplate)

      // Build carousel/gallery image lists from pageImages
      const projectData = {
        ...formData,
        designStyle: selectedDesignStyle,
        contentSections: selectedSections,
        contentTone: selectedTone,
        specialFeatures: selectedFeatures,
        fontFamily: selectedFont,
        navigationStyle: selectedNavType,
        heroLayout: formData.heroLayout || "fullscreen",
        contentStructure: formData.contentStructure || "single-page",
        footerStyle: formData.footerStyle || "comprehensive",
        mobileLayout: formData.mobileLayout || "mobile-first",
        navType: selectedNavType,
        pageCarousel,
        pageGallery,
        template: selectedTemplate,
        category: selectedCategory,
        numberOfPages: String(normalizedPageNames.length),
        pageNames: normalizedPageNames.join(','),
        sectionPageMap,
        pageLayouts,
        pageSectionSizes,
        pageImages: formData.pageImages,
        brandColors: formData.brandColors,
        templateSections: selectedTemplateDef?.sections || [],
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      })

      if (!res.ok) throw new Error("Failed to create project")

      const project = await res.json()
      router.push(`/dashboard/projects/${project.id}?mode=planner&from=wizard`)
    } catch (error) {
      console.error("Error creating project:", error)
      alert("Failed to create project. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 7 helpers (outside render to avoid IIFE issues) ─────────────────
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

  const updatePageName = (pi: number, newName: string) => {
    setPageNamingError("")
    setPageNamesArray(prev => {
      const next = [...prev]
      if (pi === 0) {
        next[pi] = 'Home'
        return next
      }

      const oldName = next[pi]
      const rawName = newName ?? ''
      const safeName = rawName.trim()
      next[pi] = rawName

      if (!oldName || !safeName || oldName === safeName) {
        return next
      }

      // Keep Step 6 structure/settings mapped to the renamed page
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 py-4 sm:py-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Start building your website with AI assistance
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-8 overflow-x-auto px-4">
        {[
          { n: 1, label: "Info" },
          { n: 2, label: "Template" },
          { n: 3, label: "Style" },
          { n: 4, label: "Navigation & Pages" },
          { n: 5, label: "Stage Builder" },
          { n: 6, label: "Assets" },
          { n: 7, label: "Generate" },
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
        {/* Step 1: Project Info & Uploads */}
        {currentStep === 1 && (
          <>
            {/* Project Details */}
            <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Give your project a name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Website"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A brief description of your project..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Brand Information */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Information</CardTitle>
            <CardDescription>Tell us about your brand and business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  placeholder="Your Company Name"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <Label>Brand Colors <span className="text-gray-400 font-normal text-xs">(primary first — add up to 6)</span></Label>
                  {formData.brandColors.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, brandColors: [...prev.brandColors, '#cccccc'] }))}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-500 rounded-lg px-2.5 py-1 transition-colors"
                    >
                      + Add Color
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {formData.brandColors.map((color, ci) => (
                    <div key={ci} className="relative flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-2">
                      <input
                        type="color"
                        value={color}
                        onChange={e => setFormData(prev => {
                          const c = [...prev.brandColors]; c[ci] = e.target.value
                          return { ...prev, brandColors: c, ...(ci === 0 ? { primaryColor: e.target.value } : {}) }
                        })}
                        className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0"
                        title={ci === 0 ? 'Primary color' : `Color ${ci + 1}`}
                      />
                      <input
                        type="text"
                        value={color}
                        maxLength={7}
                        title={ci === 0 ? 'Primary color hex' : `Color ${ci + 1} hex`}
                        placeholder="#0056b3"
                        onChange={e => setFormData(prev => {
                          const c = [...prev.brandColors]; c[ci] = e.target.value
                          return { ...prev, brandColors: c, ...(ci === 0 ? { primaryColor: e.target.value } : {}) }
                        })}
                        className="w-20 text-xs font-mono border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 bg-white"
                      />
                      <span className="text-[10px] text-gray-400 font-medium">{ci === 0 ? 'Primary' : ci === 1 ? 'Secondary' : ci === 2 ? 'Accent' : `Color ${ci+1}`}</span>
                      {formData.brandColors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => {
                            const c = prev.brandColors.filter((_, i) => i !== ci)
                            return { ...prev, brandColors: c, primaryColor: c[0] || '#0056b3' }
                          })}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo">Brand Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="cursor-pointer"
              />
              {formData.logo && (
                <div className="mt-2 relative inline-block">
                  <Image
                    src={formData.logo}
                    alt="Logo preview"
                    width={160}
                    height={80}
                    className="h-20 w-auto border rounded"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo: "" })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Tell us about your company</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mission">Mission</Label>
                <Textarea
                  id="mission"
                  placeholder="What is your company's mission?"
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vision">Vision</Label>
                <Textarea
                  id="vision"
                  placeholder="What is your company's vision?"
                  value={formData.vision}
                  onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aboutUs">About Us</Label>
                <Textarea
                  id="aboutUs"
                  placeholder="Tell us about your company, history, values, and what makes you unique..."
                  value={formData.aboutUs}
                  onChange={(e) => setFormData({ ...formData, aboutUs: e.target.value })}
                  rows={5}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Our Services */}
        <Card>
          <CardHeader>
            <CardTitle>Our Services</CardTitle>
            <CardDescription>What services or products do you offer?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="servicesDescription">Services Overview</Label>
              <Textarea
                id="servicesDescription"
                placeholder="Describe the main services or products you offer..."
                value={formData.servicesDescription}
                onChange={(e) => setFormData({ ...formData, servicesDescription: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Individual Services <span className="text-gray-400 font-normal text-xs">(press Enter or comma to add)</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Web Design, SEO, Branding…"
                  value={serviceInput}
                  onChange={e => setServiceInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && serviceInput.trim()) {
                      e.preventDefault()
                      const val = serviceInput.trim().replace(/,$/, '')
                      if (val && !formData.servicesList.includes(val)) {
                        setFormData(prev => ({ ...prev, servicesList: [...prev.servicesList, val] }))
                      }
                      setServiceInput("")
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const val = serviceInput.trim()
                    if (val && !formData.servicesList.includes(val)) {
                      setFormData(prev => ({ ...prev, servicesList: [...prev.servicesList, val] }))
                    }
                    setServiceInput("")
                  }}
                >
                  Add
                </Button>
              </div>
              {formData.servicesList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.servicesList.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-1 rounded-full">
                      {s}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, servicesList: prev.servicesList.filter((_, idx) => idx !== i) }))}
                        className="text-blue-400 hover:text-blue-700 font-bold leading-none ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>How can customers reach you?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Business Location</Label>
              <Input
                id="location"
                placeholder="123 Main St, City, Country"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
            <CardDescription>Connect your social media profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook URL</Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/yourpage"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter URL</Label>
                <Input
                  id="twitter"
                  placeholder="https://twitter.com/yourhandle"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/company/yourcompany"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/yourhandle"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                />
              </div>
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

            <div className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:space-x-4">
                <div className="text-4xl">🤖</div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2">Auto-Choose with AI</h4>
                  <p className="text-gray-700 text-sm mb-4">Let AI pick the best category + template from your business details.</p>
                  <Button
                    type="button"
                    onClick={() => {
                      setUseAI(true)
                      handleAIRecommendation()
                      setCurrentStep(2)
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    ✨ Use AI Recommendation
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1 Navigation */}
        <div className="flex flex-wrap justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">
              Next: Choose template
            </span>
            <Button 
              type="button" 
              size="lg" 
              onClick={handleNext}
              disabled={!formData.name || !formData.aboutUs || !selectedCategory}
            >
              Save & Continue →
            </Button>
          </div>
        </div>
          </>
        )}

        {/* Step 2: Template Selection */}
        {currentStep === 2 && (
          <>
            {/* Project Summary Card */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {formData.logo && (
                    <Image
                      src={formData.logo}
                      alt="Logo"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain rounded border"
                      unoptimized
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{formData.name || "Your Project"}</h3>
                    <p className="text-sm text-gray-600">
                      {formData.brandName && `${formData.brandName} • `}
                      Category: <span className="font-medium capitalize">{selectedCategory}</span>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                >
                  ✏️ Edit Details
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {useAI ? "AI Recommended Template" : "Choose Your Template & Theme"}
                </h2>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">
                    {useAI 
                      ? "Based on your business information, we recommend this template" 
                      : `Browse and select from our ${selectedCategory} templates`
                    }
                  </p>
                  {!useAI && selectedCategory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentStep(1)
                        setSelectedTemplate("")
                      }}
                    >
                      Change Category
                    </Button>
                  )}
                </div>
              </div>

              {/* Template Grid */}
              {!useAI && (
                <TemplateGrid
                  templatesByCategory={templates}
                  selectedCategory={selectedCategory}
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={handleTemplateSelect}
                  onSelectCategory={setSelectedCategory}
                />
              )}

              {/* AI Recommendation Banner */}
              {useAI && selectedTemplate && (
                <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-2xl">✨</span>
                    <span className="font-semibold text-purple-700">AI Recommendation</span>
                  </div>
                  {Object.values(templates).flat().filter(t => t.id === selectedTemplate).map(template => (
                    <div key={template.id} className="bg-white rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">{template.icon}</div>
                        <div>
                          <h3 className="text-xl font-semibold">{template.name}</h3>
                          <p className="text-gray-600 text-sm">{template.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setUseAI(false)
                      setSelectedTemplate("")
                    }}
                  >
                    Browse All Templates
                  </Button>
                </div>
              )}

            </div>

            {/* Step 2 Navigation */}
            <div className="flex flex-wrap justify-between items-center gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                className="px-4 sm:px-8"
              >
                ← Back to Info
              </Button>
              <div className="flex items-center gap-3">
                {selectedTemplate && (
                  <span className="hidden sm:block text-sm text-gray-600">
                    Template selected: <span className="font-semibold text-blue-600">
                      {getTemplateLabel(selectedTemplate)}
                    </span>
                  </span>
                )}
                <Button 
                  type="button"
                  size="lg"
                  onClick={handleNext}
                  className="px-4 sm:px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  disabled={!selectedTemplate}
                >
                  Continue to Style →
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Design Style Selection */}
        {currentStep === 3 && (
          <Card className="p-4 sm:p-8">
            <DesignStylePicker
              selectedStyle={selectedDesignStyle}
              onStyleChange={setSelectedDesignStyle}
              className="mb-6"
              brandColors={formData.brandColors}
            />

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
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                className="px-4 sm:px-8"
              >
                ← Back to Templates
              </Button>
              <Button 
                type="button"
                size="lg"
                onClick={handleNext}
                className="px-4 sm:px-8"
                disabled={!selectedDesignStyle || !selectedTone}
              >
                Continue to Navigation & Pages →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Navigation & Pages */}
        {currentStep === 4 && (
          <Card className="p-4 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Navigation & Pages Setup</h2>
              <p className="text-gray-500 text-sm mt-1">Set how visitors navigate and define your page list before arranging row layouts.</p>
            </div>

            <NavStyleSelector selectedNavType={selectedNavType} onChange={setSelectedNavType} />

            <FooterStyleSelector
              selectedFooterStyle={formData.footerStyle}
              onChange={(value) => setFormData((previous) => ({ ...previous, footerStyle: value }))}
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
                          onChange={(event) => updatePageName(pageIndex, event.target.value)}
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                className="px-4 sm:px-8"
              >
                ← Back to Style
              </Button>
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

                  if (pageNamesArray.length < 1) {
                    setPageNamingError("Please keep at least one page.")
                    return
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

        {/* Step 5: Stage Builder */}
        {currentStep === 5 && (
          <Card className="p-4 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Scratch Stage Builder</h2>
              <p className="text-gray-500 text-sm mt-1">Arrange rows and blocks page-by-page, including Carousel/Gallery, drag-drop ordering, and section sizes.</p>
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
                  <div className="font-medium text-blue-900">{FOOTER_STYLE_OPTIONS.find((option) => option.id === formData.footerStyle)?.label || formData.footerStyle}</div>
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
              selectedHeroLayout={formData.heroLayout}
              selectedContentStructure={formData.contentStructure}
              selectedFooterStyle={formData.footerStyle}
              selectedMobileLayout={formData.mobileLayout}
              onPageCountChange={updatePageCount}
              onNavTypeChange={setSelectedNavType}
              onSectionsChange={setSelectedSections}
              onToneChange={setSelectedTone}
              onFeaturesChange={setSelectedFeatures}
              onHeroLayoutChange={(value) => setFormData((previous) => ({ ...previous, heroLayout: value }))}
              onContentStructureChange={(value) => setFormData((previous) => ({ ...previous, contentStructure: value }))}
              onFooterStyleChange={(value) => setFormData((previous) => ({ ...previous, footerStyle: value }))}
              onMobileLayoutChange={(value) => setFormData((previous) => ({ ...previous, mobileLayout: value }))}
              onPageNameChange={updatePageName}
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                className="px-4 sm:px-8"
              >
                ← Back to Navigation & Pages
              </Button>
              <Button 
                type="button"
                size="lg"
                onClick={handleNext}
                className="px-4 sm:px-8"
                disabled={selectedSections.length === 0 || !selectedTone}
              >
                Continue to Assets →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 6: Pages & Images */}
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
              <Button type="button" variant="outline" size="lg" onClick={handlePrevious} className="px-4 sm:px-8">
                ← Back to Stage Builder
              </Button>
              <Button type="button" size="lg" onClick={handleNext} className="px-4 sm:px-8 bg-blue-600 hover:bg-blue-700 text-white">
                Continue to Review →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 7: Final Summary and Generation */}
        {currentStep === 7 && (
          <Card className="p-4 sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate Your Website!</h2>
              <p className="text-gray-600">
                Review your selections below and generate your professional website with AI.
              </p>
            </div>

            {/* Comprehensive Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Template & Style Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    🎨 Design Foundation
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Template:</span>
                      <span className="font-medium text-blue-900">
                        {getTemplateLabel(selectedTemplate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Design Style:</span>
                      <span className="font-medium text-blue-900">Modern {selectedDesignStyle.charAt(0).toUpperCase() + selectedDesignStyle.slice(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Content Tone:</span>
                      <span className="font-medium text-blue-900">{selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Font:</span>
                      <span className="font-medium text-blue-900">{getFontLabel(selectedFont)}</span>
                    </div>
                  </div>
                </div>

                {/* Content Summary */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                    📄 Content & Features
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-green-700">Sections ({selectedSections.length}):</span>
                      <div className="mt-1 text-green-900 font-medium">
                        {selectedSections.slice(0, 4).join(", ")}
                        {selectedSections.length > 4 && `, +${selectedSections.length - 4} more`}
                      </div>
                    </div>
                    {selectedFeatures.length > 0 && (
                      <div>
                        <span className="text-green-700">Special Features ({selectedFeatures.length}):</span>
                        <div className="mt-1 text-green-900 font-medium">
                          {selectedFeatures.slice(0, 3).join(", ")}
                          {selectedFeatures.length > 3 && `, +${selectedFeatures.length - 3} more`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Layout Summary */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                    🧱 Stage Structure
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Navigation:</span>
                      <span className="font-medium text-purple-900">
                        {selectedNavType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">Stages:</span>
                      <span className="font-medium text-purple-900">{pageNamesArray.length}</span>
                    </div>
                    <div className="text-purple-900 font-medium text-right break-words">
                      {pageNamesArray.join(', ')}
                    </div>
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
                        <FooterPreview id={formData.footerStyle} active={true} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Brand Summary */}
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-3 flex items-center">
                    🏷️ Brand Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-amber-700">Project:</span>
                      <span className="font-medium text-amber-900">{formData.name || 'My Website'}</span>
                    </div>
                    {formData.brandName && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">Brand:</span>
                        <span className="font-medium text-amber-900">{formData.brandName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700">Primary Color:</span>
                      <div className="flex items-center space-x-2">
                        <div className="px-2 py-0.5 rounded-md border border-amber-300 bg-white text-[11px] font-mono text-amber-900">
                          HEX
                        </div>
                        <span className="font-medium text-amber-900">{formData.primaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SiteMapPreview pageNames={pageNamesArray} getReadableLayoutRows={getReadableLayoutRows} />

            <div className="flex flex-wrap justify-between items-center gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                className="px-4 sm:px-8"
              >
                ← Back to Assets
              </Button>
              <div className="flex flex-wrap items-center gap-4">
                <div className="hidden sm:block text-right">
                  <div className="text-sm text-gray-600">Ready to generate with:</div>
                  <div className="text-sm font-medium text-green-600">
                    ✓ {selectedSections.length} sections
                    ✓ {selectedFeatures.length} features
                    ✓ {selectedDesignStyle} style
                  </div>
                </div>
                <Button 
                  type="submit"
                  size="lg"
                  className="px-4 sm:px-8 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating Your Website...
                    </>
                  ) : (
                    <>🚀 Generate Beautiful Website</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </form>
    </div>
  )
}
