'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles, Folder, FileCode, Play, Bot, Undo, Redo, Monitor, Tablet, Smartphone, RefreshCw, Code, ChevronLeft, ChevronRight, Coins } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { AIChat } from '@/components/ai/ai-chat'

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-slate-400">Loading editor...</div>
})

const initialFiles = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Builder Demo</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Your Creative Space</h1>
            <p class="tagline">Where ideas come to life! ✨</p>
        </div>
        
        <div class="content">
            <div class="card">
                <div class="emoji">🚀</div>
                <h2>Ready to Build?</h2>
                <p>Start creating something amazing with AI assistance</p>
            </div>
            
            <div class="card">
                <div class="emoji">💡</div>
                <h2>Get Inspired</h2>
                <p>Tell the AI what you want to create and watch the magic happen</p>
            </div>
            
            <div class="card">
                <div class="emoji">🎉</div>
                <h2>Have Fun</h2>
                <p>Building websites should be enjoyable and exciting!</p>
            </div>
        </div>
        
        <div class="footer">
            <p>💻 Made with love using AI Builder</p>
        </div>
    </div>
</body>
</html>`,
  'style.css': `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    background: linear-gradient(135deg, #ff6b35 0%, #4a90e2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 20px;
}

.header {
    text-align: center;
    color: white;
    margin-bottom: 60px;
    animation: fadeIn 1s ease-in;
}

.header h1 {
    font-size: 48px;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.tagline {
    font-size: 20px;
    opacity: 0.95;
}

.content {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    margin-bottom: 60px;
}

.card {
    background: white;
    padding: 40px 30px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: slideUp 0.6s ease-out;
}

.card:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 40px rgba(0,0,0,0.3);
}

.emoji {
    font-size: 64px;
    margin-bottom: 20px;
}

.card h2 {
    color: #333;
    font-size: 24px;
    margin-bottom: 10px;
}

.card p {
    color: #666;
    font-size: 16px;
}

.footer {
    text-align: center;
    color: white;
    font-size: 14px;
    opacity: 0.9;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}`,
  'script.js': `console.log('Welcome to AI Builder Demo!');

// Your JavaScript code here`
}

const demoExamples = [
  "Create a hero section with a gradient background and a call-to-action button",
  "Build a pricing card with three tiers: Basic, Pro, and Enterprise",
  "Create a contact form with name, email, and message fields",
  "Design a navigation bar with logo and menu items",
  "Build a feature showcase section with icons and descriptions"
]

export default function DemoPage() {
  const [files, setFiles] = useState<Record<string, string>>(initialFiles)
  const [currentFile, setCurrentFile] = useState('index.html')
  const [showAIChat, setShowAIChat] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [demoCredits, setDemoCredits] = useState(10)
  const [showCode, setShowCode] = useState(false)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('preview')

  const handleEditorWillMount = (monaco: any) => {
    // Configure Monaco environment to use CDN for workers
    if (typeof window !== 'undefined') {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: any, label: string) {
          if (label === 'json') {
            return '_next/static/vs/language/json/json.worker.js'
          }
          if (label === 'css' || label === 'scss' || label === 'less') {
            return '_next/static/vs/language/css/css.worker.js'
          }
          if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return '_next/static/vs/language/html/html.worker.js'
          }
          if (label === 'typescript' || label === 'javascript') {
            return '_next/static/vs/language/typescript/ts.worker.js'
          }
          return '_next/static/vs/editor/editor.worker.js'
        }
      }
    }
  }

  const handleCodeGenerated = (code: string) => {
    // If it's a complete HTML document, replace the entire index.html
    if (code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html')) {
      setFiles(prev => ({
        ...prev,
        'index.html': code
      }))
    } else {
      // Otherwise append to current file (for code snippets)
      const updatedCode = (files as Record<string, string>)[currentFile] + '\n\n' + code
      setFiles(prev => ({
        ...prev,
        [currentFile]: updatedCode
      }))
    }
    setPreviewKey(prev => prev + 1)
    setDemoCredits(prev => Math.max(0, prev - 1))
  }

  const generatePreviewHTML = () => {
    const mobileFix = `
      <style id="__mobile_fix__">
        @media (max-width: 768px) {
          html, body { overflow-x: hidden !important; }
          body > * { max-width: 100% !important; }
          img, video, iframe, table { max-width: 100% !important; }
        }
      </style>`
    const html = files['index.html'] || ''
    // If complete HTML doc, inject mobile fix before </head>
    if (html.trim().toLowerCase().startsWith('<!doctype') || html.trim().toLowerCase().startsWith('<html')) {
      const headClose = html.toLowerCase().indexOf('</head>')
      if (headClose !== -1) {
        return html.slice(0, headClose) + mobileFix + html.slice(headClose)
      }
      return html
    }
    // Legacy: strip and rewrap
    const cleanHtml = html
      .replace(/<link[^>]*>/gi, '')
      .replace(/<script[^>]*src=[^>]*><\/script>/gi, '')
      .replace(/<html[^>]*>|<\/html>|<head[^>]*>.*?<\/head>|<body[^>]*>|<\/body>/gi, '')
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${files['style.css'] || ''}</style>
          ${mobileFix}
        </head>
        <body>
          ${cleanHtml}
          <script>${files['script.js'] || ''}</script>
        </body>
      </html>
    `
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between py-3 bg-[#1a1a1a] border-b border-[#333]">
        {/* Left Section */}
        <div className="flex items-center gap-3 pl-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="h-6 w-px bg-[#333]"></div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
            <span className="font-medium text-white">Demo Project</span>
          </div>
        </div>

        {/* Center Section - Action Buttons (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/10"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/10"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          <div className="h-6 w-px bg-[#333] mx-2"></div>
          
          {/* Screen Size Toggle */}
          <div className="flex items-center gap-1 bg-[#141414] border border-[#2a2a2a] rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-[#2a2a2a] text-white"
              title="Desktop View"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-[#222]"
              title="Tablet View"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-[#222]"
              title="Mobile View"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="h-6 w-px bg-[#333] mx-2"></div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreviewKey(prev => prev + 1)}
            className="text-gray-400 hover:text-white hover:bg-white/10 gap-2"
            title="Refresh Preview"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Refresh</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 gap-2"
          >
            <Code className="h-4 w-4" />
            <span className="text-sm">Code</span>
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 pr-4">
          {/* Demo Credits Display */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-[#2a2a2a] rounded-lg border border-[#333]">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-white">{demoCredits} <span className="hidden sm:inline">Demo </span>Credits</span>
          </div>
          
          <div className="h-6 w-px bg-[#333]"></div>
          
          <Link href="/auth/signin">
            <Button
              size="xs"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <span className="hidden sm:inline">Sign Up for Full Access</span>
              <span className="sm:hidden">Sign Up</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden md:flex-row flex-col min-h-0">
        {/* AI Assistant Panel */}
        {showAIChat && (
          <div className={`border-r border-[#222] bg-[#0f0f0f] flex flex-col relative
            ${ mobileTab === 'chat' ? 'flex w-full md:w-[360px] md:flex-none' : 'hidden md:flex md:w-[360px] md:flex-none' }`}
          >
            <div className="absolute top-3 right-3 z-10 hidden md:block">
              <button
                onClick={() => setShowAIChat(false)}
                className="p-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg transition-colors"
                title="Hide Chat"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <AIChat 
              projectId="demo" 
              projectFiles={files}
              onCodeGenerated={handleCodeGenerated}
              onLoadingChange={setIsAiGenerating}
              initialMode="agent"
            />
          </div>
        )}

        {/* Show Chat Button - desktop only */}
        {!showAIChat && (
          <button
            onClick={() => setShowAIChat(true)}
            className="hidden md:flex fixed left-4 bottom-4 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl shadow-lg z-50 transition-all duration-200"
            title="Show AI Assistant"
          >
            <ChevronRight className="h-5 w-5" />
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">AI Assistant</span>
          </button>
        )}

        {/* Preview/Code Area */}
        <div className={`flex-1 flex flex-col overflow-hidden
          ${ !showAIChat || mobileTab === 'preview' ? 'flex' : 'hidden md:flex' }`}
        >
          {showCode ? (
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage={
                  currentFile.endsWith('.html') ? 'html' :
                  currentFile.endsWith('.css') ? 'css' : 'javascript'
                }
                defaultValue={files[currentFile]}
                value={files[currentFile]}
                onChange={(value) => {
                  setFiles(prev => ({
                    ...prev,
                    [currentFile]: value || ''
                  }))
                  setPreviewKey(prev => prev + 1)
                }}
                theme="vs-dark"
                beforeMount={handleEditorWillMount}
                onMount={(editor) => {
                  console.log('Monaco Editor mounted successfully')
                  editor.focus()
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  tabSize: 2,
                }}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden bg-white">
              <iframe
                key={previewKey}
                srcDoc={generatePreviewHTML()}
                className="w-full h-full"
                title="Preview"
                sandbox="allow-scripts"
              />
            </div>
          )}
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden shrink-0 flex bg-[#1a1a1a] border-t border-[#333]">
          <button
            onClick={() => { setShowAIChat(true); setMobileTab('chat') }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
              ${showAIChat && mobileTab === 'chat' ? 'text-white border-t-2 border-blue-500 -mt-px' : 'text-gray-400'}`}
          >
            <Sparkles className="h-4 w-4" />
            AI Chat
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
              ${mobileTab === 'preview' ? 'text-white border-t-2 border-blue-500 -mt-px' : 'text-gray-400'}`}
          >
            <Monitor className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>
    </div>
  )
}
