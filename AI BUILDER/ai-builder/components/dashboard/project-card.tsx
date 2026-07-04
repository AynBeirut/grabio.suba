"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2 } from "lucide-react"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    framework: string
    updatedAt: Date
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Failed to delete project')
        setIsDeleting(false)
        setShowConfirm(false)
      }
    } catch (error) {
      alert('Error deleting project')
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  const description = project.description || 'No description'
  const maxLength = 120
  const isTruncated = description.length > maxLength
  const displayDescription = isTruncated 
    ? description.substring(0, maxLength) + '...' 
    : description

  return (
    <Card className="hover:shadow-lg transition-shadow bg-[#1a1a1a] border-[#333] flex flex-col h-[280px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-white truncate" title={project.name}>
          {project.name}
        </CardTitle>
        <CardDescription className="text-gray-400 h-[60px] overflow-hidden">
          <span className="line-clamp-3">
            {displayDescription}
          </span>
          {isTruncated && (
            <Link 
              href={`/dashboard/projects/${project.id}/edit`}
              className="text-purple-400 hover:text-purple-300 text-xs ml-1 inline-block"
            >
              Read more
            </Link>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
          <span className="text-xs">{project.framework}</span>
          <span className="text-xs">{new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
            <Button variant="default" className="w-full">
              Open Builder
            </Button>
          </Link>
          <Link href={`/dashboard/projects/${project.id}/edit`}>
            <Button variant="outline">
              ✏️
            </Button>
          </Link>
          <Button
            variant={showConfirm ? "destructive" : "outline"}
            onClick={handleDelete}
            disabled={isDeleting}
            title={showConfirm ? "Click again to confirm" : "Delete project"}
          >
            {isDeleting ? "..." : showConfirm ? "?" : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
        {showConfirm && (
          <p className="text-xs text-orange-400 mt-2 text-center">
            Click delete again to confirm
          </p>
        )}
      </CardContent>
    </Card>
  )
}
