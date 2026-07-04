# AI Integration Guide

## Overview
The AI Builder platform now supports multiple AI providers for code generation:

- **DeepSeek** (Cheapest) - $0.27/$1.1 per 1M tokens
- **OpenAI GPT-3.5** - $0.5/$1.5 per 1M tokens  
- **OpenAI GPT-4** - $30/$60 per 1M tokens
- **Anthropic Claude 3 Haiku** - $0.25/$1.25 per 1M tokens
- **Anthropic Claude 3.5 Sonnet** - $3/$15 per 1M tokens

## DeepSeek API Key Setup

Your DeepSeek API key has been configured in `.env`:
```
DEEPSEEK_API_KEY="[set-in-local-env]"
```

## How It Works

### Architecture
1. **AI Gateway** (`/lib/ai-gateway.ts`) - Unified interface for all AI providers
2. **API Route** (`/app/api/ai/chat/route.ts`) - Handles chat requests, credit deduction, transaction logging
3. **Chat Component** (`/components/ai/ai-chat.tsx`) - UI for interacting with AI

### Credit System
- 1 credit = $0.01
- Costs calculated in real-time based on token usage
- Automatic credit deduction after each request
- Transaction history logged in database

### Example Costs
**DeepSeek Coder** (Recommended for code generation):
- Small request (1000 input + 500 output tokens): ~1 credit
- Medium request (2000 input + 1000 output tokens): ~2 credits
- Large request (4000 input + 2000 output tokens): ~4 credits

**GPT-3.5 Turbo**:
- Similar requests: ~1-3 credits

**GPT-4**:
- Similar requests: ~15-60 credits (expensive!)

## Usage in Editor

1. Open any project in the editor
2. Click "AI Assistant" button in the top toolbar
3. Select your preferred AI provider (DeepSeek recommended)
4. Type your request, e.g.:
   - "Create a hero section with gradient background"
   - "Add a contact form with validation"
   - "Fix the responsive layout for mobile"
5. Generated code will be inserted into the current file

## Google OAuth Fix

**Error**: `redirect_uri_mismatch`

**Solution**: Add this exact URI to your Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID: `1057387940389-u5df0dh7b8ojjeghcl55ci5g5ijeclic`
3. Under "Authorized redirect URIs", add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Click "Save"

## Testing

After fixing the OAuth redirect URI, you can test the full flow:

1. Go to http://localhost:3000
2. Sign in with Google (mooveelectro@gmail.com)
3. You'll start with 10 free credits
4. Create a new project
5. Click "AI Assistant" to test DeepSeek integration

## API Reference

### POST /api/ai/chat

Request:
```json
{
  "messages": [
    { "role": "system", "content": "You are a web developer" },
    { "role": "user", "content": "Create a button component" }
  ],
  "provider": "deepseek",
  "model": "deepseek-coder"
}
```

Response:
```json
{
  "content": "<!-- Generated code here -->",
  "usage": {
    "inputTokens": 1234,
    "outputTokens": 567,
    "cost": 0.0015,
    "credits": 1
  },
  "remainingCredits": 9
}
```

## Cost Optimization Tips

1. **Use DeepSeek** for most tasks - it's 100x cheaper than GPT-4
2. **Be specific** in prompts to avoid back-and-forth
3. **Test with small requests** before running large generations
4. **Monitor credits** in the dashboard header

## Next Steps

- [ ] Add streaming responses for real-time code generation
- [ ] Implement context awareness (send current file content)
- [ ] Add code diff view for AI suggestions
- [ ] Enable batch operations (update multiple files)
