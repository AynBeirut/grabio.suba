import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-9 w-48 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-5 w-64 bg-gray-800 rounded animate-pulse mt-2"></div>
        </div>
        <div className="h-10 w-36 bg-gray-700 rounded animate-pulse"></div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-3">
            <div className="h-6 w-3/4 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-2/3 bg-gray-700 rounded animate-pulse"></div>
            <div className="flex justify-between items-center mt-4">
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    </div>
  )
}
