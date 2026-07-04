import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ConditionalNav } from "@/components/dashboard/conditional-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <ConditionalNav user={session.user} />
      <main className="w-full">
        {children}
      </main>
    </div>
  )
}
