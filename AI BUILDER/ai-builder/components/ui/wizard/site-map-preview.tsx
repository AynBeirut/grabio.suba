"use client"

interface SiteMapPreviewProps {
  pageNames: string[]
  getReadableLayoutRows: (pageName: string) => string[]
}

export function SiteMapPreview({ pageNames, getReadableLayoutRows }: SiteMapPreviewProps) {
  const safePages = pageNames.length > 0 ? pageNames : ["Home"]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="font-semibold text-slate-900">🗺️ Designer Sitemap</h4>
          <p className="text-sm text-slate-500">A clear map of the pages and the main layout blocks the builder should follow.</p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-3 py-1">
          {safePages.length} page{safePages.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {safePages.map((pageName, pageIndex) => {
          const rows = getReadableLayoutRows(pageName)
          return (
            <div key={pageName} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center min-w-[70px] rounded-lg bg-blue-600 text-white text-xs font-bold px-2.5 py-1.5">
                    Page {pageIndex + 1}
                  </span>
                  <span className="font-semibold text-slate-900">{pageName}</span>
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {rows.length || 0} row{rows.length === 1 ? "" : "s"}
                </span>
              </div>

              {rows.length > 0 ? (
                <div className="space-y-2">
                  {rows.map((row, rowIndex) => {
                    const blocks = row.split(" + ").map((block) => block.trim()).filter(Boolean)
                    return (
                      <div key={`${pageName}-${rowIndex}`} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                          Row {rowIndex + 1}
                        </div>
                        <div className={`grid gap-2 ${blocks.length === 1 ? "grid-cols-1" : blocks.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                          {blocks.map((block) => (
                            <div key={`${pageName}-${rowIndex}-${block}`} className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-3 py-2 text-xs font-semibold text-slate-700 text-center">
                              {block}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500 text-center">
                  Default template layout will be used for this page.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
