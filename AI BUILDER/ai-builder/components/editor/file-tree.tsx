"use client"

import { File, Folder, ChevronRight, ChevronDown, Plus, Trash2, Edit2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface FileNode {
  name: string
  type: "file" | "folder"
  content?: string
  children?: FileNode[]
}

interface FileTreeProps {
  files: Record<string, string>
  selectedFile: string | null
  onFileSelect: (filename: string) => void
  onFileCreate?: (filename: string) => void
  onFileDelete?: (filename: string) => void
  onFileRename?: (oldName: string, newName: string) => void
}

export function FileTree({
  files,
  selectedFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["/"]));
  const [newFileName, setNewFileName] = useState("")
  const [showNewFileInput, setShowNewFileInput] = useState(false)

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    const iconClass = "h-4 w-4"
    
    switch (ext) {
      case "html":
        return <File className={`${iconClass} text-orange-500`} />
      case "css":
        return <File className={`${iconClass} text-blue-500`} />
      case "js":
        return <File className={`${iconClass} text-yellow-500`} />
      case "json":
        return <File className={`${iconClass} text-green-500`} />
      default:
        return <File className={iconClass} />
    }
  }

  const handleCreateFile = () => {
    if (newFileName && onFileCreate) {
      onFileCreate(newFileName)
      setNewFileName("")
      setShowNewFileInput(false)
    }
  }

  return (
    <div className="h-full bg-slate-900 text-slate-100 p-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-semibold uppercase text-slate-400">Files</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowNewFileInput(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showNewFileInput && (
        <div className="mb-2 px-2">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFile()
              if (e.key === "Escape") setShowNewFileInput(false)
            }}
            placeholder="filename.ext"
            className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded"
            autoFocus
          />
        </div>
      )}

      <div className="space-y-1">
        {Object.keys(files).map((filename) => (
          <div
            key={filename}
            className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-slate-800 ${
              selectedFile === filename ? "bg-slate-800" : ""
            }`}
            onClick={() => onFileSelect(filename)}
          >
            <div className="flex items-center gap-2 flex-1">
              {getFileIcon(filename)}
              <span className="text-sm">{filename}</span>
            </div>
            {onFileDelete && (
              <button
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete ${filename}?`)) {
                    onFileDelete(filename)
                  }
                }}
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
