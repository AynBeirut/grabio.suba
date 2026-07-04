import { NextResponse } from "next/server"

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Return mock demo project data for the demo page
  return NextResponse.json({
    id: "demo",
    name: "Demo Project",
    description: "Try out AI Builder with this interactive demo",
    framework: "HTML/CSS/JS",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Builder Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            text-align: center;
        }
        h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            font-size: 1.2em;
            margin-bottom: 30px;
        }
        .cta {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1.1em;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .cta:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Welcome to AI Builder Demo!</h1>
        <p>Ask the AI assistant to build something amazing!</p>
        <button class="cta" onclick="alert('Click the AI Assistant button on the left to get started!')">Get Started</button>
    </div>
</body>
</html>`,
      "style.css": "",
      "script.js": "console.log('Welcome to AI Builder Demo!');"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}
