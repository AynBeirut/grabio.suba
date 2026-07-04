"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { User } from "next-auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Coins, LogOut, Settings } from "lucide-react"

interface DashboardNavProps {
  user: User & { credits?: number }
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const isBuilderPage = pathname?.includes('/projects/') && !pathname?.endsWith('/new')
  
  return (
    <div className="bg-[#0f0f0f] border-b border-[#222]">
      <div className="container mx-auto px-3 sm:px-4 py-2">
        <div className="flex items-center justify-end space-x-2 sm:space-x-3">
          {!isBuilderPage && (
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400">
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{user.credits || 0} Credits</span>
            </div>
          )}
          
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#1a1a1a] h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-gray-400 hover:text-white hover:bg-[#1a1a1a] h-8 w-8 p-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
