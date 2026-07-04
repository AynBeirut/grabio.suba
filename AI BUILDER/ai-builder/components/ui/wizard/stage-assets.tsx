import type { Dispatch, SetStateAction } from "react"

type UploadPickerZone = { page: string; zone: string } | null

type AssetZone = {
  key: string
  label: string
  hint: string
}

interface StageAssetsProps {
  pageNames: string[]
  baseZones: AssetZone[]
  pageCarousel: Record<string, number>
  pageGallery: Record<string, number>
  pageImages: Record<string, Record<string, string>>
  pageImageFileNames: Record<string, Record<string, string>>
  uploadPickerZone: UploadPickerZone
  setUploadPickerZone: Dispatch<SetStateAction<UploadPickerZone>>
  onUploadFile: (file: File, pageName: string, zone: string) => Promise<void>
  onRemoveAsset: (pageName: string, zone: string) => void
}

export function StageAssets({
  pageNames,
  baseZones,
  pageCarousel,
  pageGallery,
  pageImages,
  pageImageFileNames,
  uploadPickerZone,
  setUploadPickerZone,
  onUploadFile,
  onRemoveAsset,
}: StageAssetsProps) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Stage Assets</h2>
        <p className="text-gray-500 text-sm mt-1">Attach images to the exact blocks you designed in Stage Builder.</p>
      </div>

      <div className="space-y-5">
        {pageNames.map((pageName, pageIndex) => {
          const isFirst = pageIndex === 0
          const isLast = pageIndex === pageNames.length - 1 && pageNames.length > 1
          const zones = [
            ...baseZones,
            ...Array.from({ length: pageCarousel[pageName] || 0 }, (_, index) => ({
              key: `slide_${index + 1}`,
              label: `Slide ${index + 1}`,
              hint: `Carousel slide ${index + 1}`,
            })),
            ...Array.from({ length: pageGallery[pageName] || 0 }, (_, index) => ({
              key: `gallery_${index + 1}`,
              label: `Gallery ${index + 1}`,
              hint: `Photo gallery image ${index + 1}`,
            })),
          ]

          return (
            <div key={pageIndex} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="shrink-0 inline-flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 min-w-[60px]">
                  Page {pageIndex + 1}
                </span>

                {isFirst ? (
                  <span className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-500">🔒 Home</span>
                ) : isLast ? (
                  <span className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-500">🔒 Contact Us</span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700">
                    {pageName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {zones.map((zone) => {
                  const currentImg = pageImages?.[pageName]?.[zone.key]
                  const currentPath = pageImageFileNames?.[pageName]?.[zone.key]
                  const currentName = currentPath?.split("/").pop() || currentPath
                  const hasExisting = !!currentImg || !!currentPath
                  const picking = uploadPickerZone?.page === pageName && uploadPickerZone?.zone === zone.key

                  return (
                    <div key={zone.key} className="flex flex-col items-center gap-1.5 relative">
                      <span className="text-xs font-semibold text-gray-600">{zone.label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight text-center">{zone.hint}</span>

                      <div
                        className={`relative w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-xs gap-1 transition-colors overflow-hidden bg-white cursor-pointer ${
                          hasExisting ? "border-blue-400" : "border-gray-300 hover:border-blue-400"
                        }`}
                        style={{ aspectRatio: "16/9" }}
                        onClick={() =>
                          setUploadPickerZone((previous) =>
                            previous?.page === pageName && previous?.zone === zone.key ? null : { page: pageName, zone: zone.key }
                          )
                        }
                      >
                        {hasExisting ? (
                          <>
                            <span className="text-green-500 text-lg">✓</span>
                            <span className="text-[10px] text-gray-600 text-center break-all px-1 leading-tight">{currentName || "image uploaded"}</span>
                            <span className="text-[10px] text-blue-500 font-medium">Change</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">🖼️</span>
                            <span className="text-gray-400 text-[11px]">Click to upload</span>
                          </>
                        )}
                      </div>

                      {picking && (
                        <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-blue-200 rounded-xl shadow-lg p-2 flex flex-col gap-1.5 w-40">
                          <p className="text-[10px] font-semibold text-gray-500 px-1">Upload options</p>

                          <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer text-xs font-medium text-gray-700">
                            <span>📷 Single image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (event) => {
                                const file = event.target.files?.[0]
                                if (file) await onUploadFile(file, pageName, zone.key)
                                setUploadPickerZone(null)
                                event.target.value = ""
                              }}
                            />
                          </label>

                          <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer text-xs font-medium text-gray-700">
                            <span>🖼️ Multiple images</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={async (event) => {
                                const files = Array.from(event.target.files || [])
                                if (files.length > 0) await onUploadFile(files[0], pageName, zone.key)

                                if (zone.key.startsWith("slide_") || zone.key.startsWith("gallery_")) {
                                  const prefix = zone.key.startsWith("slide_") ? "slide_" : "gallery_"
                                  const startIndex = parseInt(zone.key.split("_")[1])
                                  for (let fileIndex = 1; fileIndex < files.length; fileIndex++) {
                                    await onUploadFile(files[fileIndex], pageName, `${prefix}${startIndex + fileIndex}`)
                                  }
                                }

                                setUploadPickerZone(null)
                                event.target.value = ""
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => setUploadPickerZone(null)}
                            className="text-[10px] text-gray-400 hover:text-gray-600 px-1 text-right"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {hasExisting && (
                        <button
                          type="button"
                          onClick={() => onRemoveAsset(pageName, zone.key)}
                          className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
