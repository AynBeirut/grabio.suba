"use client"

import { usePathname } from "next/navigation"
import { DashboardNav } from "./nav"
import { User } from "next-auth"

interface ConditionalNavProps {
  user: User & { credits?: number }
}

export function ConditionalNav({ user }: ConditionalNavProps) {
  const pathname = usePathname()
  
  // Hide nav on builder pages (project pages that aren't /new or /edit)
  const isBuilderPage = pathname?.includes('/projects/') && 
                        !pathname?.endsWith('/new') && 
                        !pathname?.includes('/edit')
  
  if (isBuilderPage) {
    return null
  }
  
  return <DashboardNav user={user} />
}
