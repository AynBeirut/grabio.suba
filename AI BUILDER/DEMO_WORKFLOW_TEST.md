# 🧪 AI Builder Demo Workflow - Test Guide

## ✅ Implementation Complete

The demo now follows the correct workflow:
**Planner Mode → Strategic Questions → Start Building Button → Agent Mode → Code Generation**

---

## 📋 Test Steps

### 1️⃣ **Start Development Server**
```bash
cd "/home/anwar/Documents/AI BUILDER/ai-builder"
npm run dev
```
Wait for "Ready" message on port 3000.

### 2️⃣ **Open Demo Page**
Navigate to: **http://localhost:3000/demo**

---

## 🎯 Phase 1: Planner Mode (Strategic Questions)

### **Expected Behavior:**
- Demo starts in **PLANNER mode** (strategic consultant)
- AI asks discovery questions about the project
- AI **REFUSES** to generate code

### **Test Actions:**

**Test A: Normal Conversation**
```
You: "I need a professional landing page for my coffee shop"
```
**Expected Response:**
- AI asks strategic questions like:
  - "What makes your coffee shop unique?"
  - "Who are your target customers?"
  - "What's your brand personality?"

**Test B: Try to Force Code Generation**
```
You: "Generate the HTML code for me now"
```
**Expected Response:**
- ❌ AI should **REFUSE** and say something like:
  - "Let me finish gathering requirements first, then we'll switch to building mode"
  - Does NOT show any HTML/CSS/JS code

**Test C: Try Direct Code Request**
```
You: "Show me the code with a blue header and contact form"
```
**Expected Response:**
- ❌ AI redirects back to strategic questions
- Asks about features, target audience, content needs
- NO code generation

---

## 🚀 Phase 2: Transition to Agent Mode

### **Expected Behavior:**
After 3-5 strategic exchanges, AI should recognize it has enough information.

**Expected AI Message:**
```
"Perfect! I now have a complete strategy for [Your Coffee Shop]. 
Your landing page will effectively [attract customers] for [coffee lovers] 
through [compelling content]. Ready to build? Click 'Start Building' to begin!"
```

### **What You Should See:**
✅ A **"🚀 Start Building Website"** button appears below the AI message

### **Test Actions:**
**Click the "Start Building Website" button**

---

## 🏗️ Phase 3: Agent Mode (Autonomous Building)

### **Expected Behavior:**
1. Mode automatically switches from PLANNER → AGENT
2. AI receives auto-prompt: "Based on our discussion, please build..."
3. AI generates complete HTML document with:
   - Proper DOCTYPE and HTML structure
   - All sections discussed (hero, about, menu, contact, etc.)
   - Embedded CSS styling
   - Responsive design
   - Real content (not placeholders)

### **What You Should See:**

**In Chat Panel (briefly):**
- AI message showing code generation in progress
- Message changes to: **"✅ Website updated successfully!"**

**In Left Sidebar (File Tree):**
- `index.html` file updates with new code
- Content reflects complete website

**In Right Panel (Preview):**
- 🎊 **Your coffee shop website appears!**
- Fully styled and functional
- Responsive design
- All sections visible

---

## 🎨 Phase 4: Iterative Refinements

### **Test Live Editing:**

**Test D: Color Changes**
```
You: "Make the header background purple"
```
**Expected:** Header changes to purple in preview

**Test E: Content Updates**
```
You: "Change the coffee shop name to 'Bean Dream Coffee'"
```
**Expected:** All instances update to "Bean Dream Coffee"

**Test F: Add Features**
```
You: "Add a customer testimonials section"
```
**Expected:** New testimonials section appears in preview

**Test G: Layout Changes**
```
You: "Make the hero section full-width with centered text"
```
**Expected:** Hero layout updates instantly

---

## 🔍 Verification Checklist

Use this checklist during your test:

### Planner Mode ✓
- [ ] Demo starts in planner mode (see "🎯 Planner" in dropdown)
- [ ] AI asks strategic questions
- [ ] AI refuses code generation when asked directly
- [ ] AI provides business/design guidance
- [ ] After 3-5 exchanges, AI suggests "Ready to start building"

### Mode Transition ✓
- [ ] "🚀 Start Building Website" button appears
- [ ] Button is clickable and visible
- [ ] Clicking button switches mode to "🤖 Agent"

### Agent Mode ✓
- [ ] Auto-prompt is sent after button click
- [ ] AI generates complete HTML code
- [ ] Chat shows "✅ Website updated successfully!"
- [ ] NO errors in browser console (F12)

### Code Application ✓
- [ ] `index.html` file updates automatically
- [ ] Preview iframe shows the website
- [ ] Website is styled correctly
- [ ] Website is responsive (resize browser)
- [ ] Real content (not "Lorem ipsum" placeholders)

### Iterative Editing ✓
- [ ] Can request color changes → preview updates
- [ ] Can request content changes → preview updates
- [ ] Can add new sections → preview updates
- [ ] Each change takes ~5-10 seconds
- [ ] Demo credits decrease with each request

---

## ❌ Troubleshooting

### **Problem: AI generates code in planner mode**
**Symptom:** AI shows HTML/CSS when asked in planner mode
**Solution:** Check system prompt at line 393-397 in ai-chat.tsx

### **Problem: "Start Building" button never appears**
**Symptom:** No button after strategic conversation
**Solution:** AI message must include phrases: "start implementing", "start building", or "ready to start"

### **Problem: Preview stays empty after building**
**Symptom:** Code generated but preview blank
**Solution:** Check:
- Browser console for errors (F12)
- handleCodeGenerated function in demo/page.tsx (line 208)
- Code extraction in ai-chat.tsx (line 476-505)

### **Problem: API returns 404**
**Symptom:** No AI responses, errors in console
**Solution:**
```bash
# Check server is running
curl http://localhost:3000/api/ai/chat

# Restart server
pkill -f "next dev"
npm run dev
```

### **Problem: Database errors**
**Symptom:** "Failed to find demo user"
**Solution:**
```bash
npx prisma generate
npx prisma db push
```

### **Problem: No AI response at all**
**Symptom:** Loading forever, no answer
**Solution:** Check .env file has AI API keys:
```env
DEEPSEEK_API_KEY=sk-xxxxx
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-xxxxx
```

---

## 🎯 Success Criteria

**Test is successful when:**
1. ✅ Planner asks strategic questions
2. ✅ Planner refuses direct code requests
3. ✅ "Start Building" button appears after conversation
4. ✅ Agent generates complete, styled HTML
5. ✅ Preview shows functional website
6. ✅ Can make iterative changes that update preview
7. ✅ No errors in browser console
8. ✅ Complete workflow takes 2-3 minutes

---

## 📸 Expected Results

**After successful test, you should have:**
- A complete coffee shop website in the preview
- Clean, professional design
- Responsive layout
- Real content (coffee shop name, menu, contact info)
- Functioning navigation
- Styled hero section
- Contact section
- Footer with social links

**This proves the AI Builder works end-to-end!** 🎉

---

## 🚀 Next Steps After Successful Test

1. **Deploy to Production**
   ```bash
   sshpass -p '5E5ns17VgAC0A8Lyef' ssh root@104.207.71.117
   cd /var/www/ai-builder
   git pull  # or upload modified files
   rm -rf .next
   npm run build
   pm2 restart ai-builder
   ```

2. **Test on Production**
   - Navigate to https://ai.aynbeirut.dev/demo
   - Repeat the workflow test
   - Verify everything works on live site

3. **Document for Users**
   - Create video tutorial showing the workflow
   - Add tooltips explaining each mode
   - Create example prompts for users

---

**Ready to test? Run the server and open http://localhost:3000/demo!** 🚀
