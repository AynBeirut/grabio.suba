import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f]">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between py-3 bg-[#1a1a1a] border-b border-[#333] px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2a2a2a] rounded animate-pulse"></div>
          <div className="w-px h-6 bg-[#333]"></div>
          <div className="w-32 h-6 bg-[#2a2a2a] rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-6 bg-[#2a2a2a] rounded animate-pulse"></div>
          <div className="w-20 h-6 bg-[#2a2a2a] rounded animate-pulse"></div>
        </div>
      </div>
      {/* Content Skeleton */}
      <div className="flex-1 flex">
        <div className="w-1/3 bg-[#1a1a1a] border-r border-[#333] p-4 space-y-4">
          <div className="h-10 bg-[#2a2a2a] rounded animate-pulse"></div>
          <div className="h-64 bg-[#2a2a2a] rounded animate-pulse"></div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0f0f0f]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
            <p className="text-gray-400 mt-4 text-sm">Loading project...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
