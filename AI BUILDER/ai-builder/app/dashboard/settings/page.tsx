import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">Settings</h1>
        <p className="text-gray-400 mb-8">
          Manage your account settings and preferences
        </p>

        {/* Profile Settings */}
        <Card className="mb-6 bg-[#1a1a1a] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white">Profile Information</CardTitle>
            <CardDescription className="text-gray-400">Update your account profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Name</Label>
              <Input
                id="name"
                defaultValue={session.user.name || ""}
                placeholder="Your name"
                className="bg-[#0f0f0f] border-[#333] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={session.user.email || ""}
                disabled
                className="bg-[#0f0f0f] border-[#333] text-gray-400"
              />
              <p className="text-sm text-gray-500">
                Email cannot be changed
              </p>
            </div>
            <Button disabled>Save Changes (Coming Soon)</Button>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card className="mb-6 bg-[#1a1a1a] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white">Credits</CardTitle>
            <CardDescription className="text-gray-400">Your current credit balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-3xl font-bold text-white">{session.user.credits || 0}</p>
                <p className="text-sm text-gray-500">Available Credits</p>
              </div>
              <Button variant="outline">Purchase Credits</Button>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="mb-6 bg-[#1a1a1a] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white">API Keys</CardTitle>
            <CardDescription className="text-gray-400">Manage your AI provider API keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deepseek" className="text-gray-300">DeepSeek API Key</Label>
              <Input
                id="deepseek"
                type="password"
                placeholder="sk-..."
                disabled
                className="bg-[#0f0f0f] border-[#333] text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openai" className="text-gray-300">OpenAI API Key</Label>
              <Input
                id="openai"
                type="password"
                placeholder="sk-..."
                disabled
                className="bg-[#0f0f0f] border-[#333] text-gray-400"
              />
            </div>
            <p className="text-sm text-gray-500">
              Custom API keys coming soon. Currently using platform keys.
            </p>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="mb-6 bg-[#1a1a1a] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white">Preferences</CardTitle>
            <CardDescription className="text-gray-400">Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates about your projects</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">Dark Mode</p>
                <p className="text-sm text-gray-500">Switch to dark theme</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-900 bg-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-red-500">Danger Zone</CardTitle>
            <CardDescription className="text-gray-400">Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              Delete Account (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
