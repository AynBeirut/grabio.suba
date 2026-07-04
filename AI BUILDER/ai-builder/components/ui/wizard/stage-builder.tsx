import { LayoutOptions } from "../layout-options"

interface StageBuilderProps {
  pageNames: string[]
  selectedNavType: string
  selectedSections: string[]
  selectedTone: string
  selectedFeatures: string[]
  selectedHeroLayout: string
  selectedContentStructure: string
  selectedFooterStyle: string
  selectedMobileLayout: string
  onPageCountChange: (count: number) => void
  onNavTypeChange: (navType: string) => void
  onSectionsChange: (sections: string[]) => void
  onToneChange: (tone: string) => void
  onFeaturesChange: (features: string[]) => void
  onHeroLayoutChange: (value: string) => void
  onContentStructureChange: (value: string) => void
  onFooterStyleChange: (value: string) => void
  onMobileLayoutChange: (value: string) => void
  onPageNameChange: (index: number, name: string) => void
  pageLayouts: Record<string, string[]>
  pageSectionSizes: Record<string, string[]>
  pageCarousel: Record<string, number>
  pageGallery: Record<string, number>
  onPageLayoutsChange: (layouts: Record<string, string[]>) => void
  onPageSectionSizesChange: (sizes: Record<string, string[]>) => void
  onPageCarouselChange: (carousel: Record<string, number>) => void
  onPageGalleryChange: (gallery: Record<string, number>) => void
  previewPrimaryColor?: string
}

export function StageBuilder({
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
}: StageBuilderProps) {
  return (
    <>
      <LayoutOptions
        pageNames={pageNames}
        pageLayouts={pageLayouts}
        pageSectionSizes={pageSectionSizes}
        pageCarousel={pageCarousel}
        pageGallery={pageGallery}
        onPageLayoutsChange={onPageLayoutsChange}
        onPageSectionSizesChange={onPageSectionSizesChange}
        onPageCarouselChange={onPageCarouselChange}
        onPageGalleryChange={onPageGalleryChange}
        previewPrimaryColor={previewPrimaryColor}
        className="mb-6"
      />
    </>
  )
}
