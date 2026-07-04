# AI Builder - Feature Roadmap & Updates

## 🎯 Upcoming Features

### 1. **Qwen API Integration**
- **Status:** ✅ Completed (Feb 23, 2026)
- **Priority:** High
- **Description:** Added Qwen2.5-Coder as AI provider option
- **Benefits:**
  - Cost: $0.10/M tokens (7x cheaper than DeepSeek)
  - Savings: ~$600 per 1000 websites built
  - Quality: Specialized for code generation
- **Implementation:** Added to ai-gateway.ts and AI_PROVIDERS list

---

### 2. **Interactive Planner Questions**
- **Status:** ✅ Completed (Feb 23, 2026)
- **Priority:** Medium
- **Description:** Questions shown one at a time with navigation
- **Features Implemented:**
  - One focused question at a time
  - Progress indicator (e.g., "Question 3 of 7")
  - Previous/Next buttons to navigate questions
  - Answers saved in real-time
  - Skip option for non-critical questions
  - Category-specific questions based on template type
  - Beautiful UI with progress bar and smooth transitions

---

### 3. **Full-Page Preview in New Tab**
- **Status:** Pending
- **Priority:** Low
- **Current:** Preview shows in iframe on right side
- **Enhancement:** Add "View" button that opens preview in new tab
- **Implementation:**
  ```typescript
  const handleOpenFullView = () => {
    const blob = new Blob([files['index.html']], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }
  ```
- **Location:** Add button next to screen size toggles (Desktop/Tablet/Mobile)
- **Icon:** ExternalLink icon
- **Estimated Time:** 30 minutes

---

### 4. **Version Control & Restore**
- **Status:** Pending
- **Priority:** High
- **Current Issue:** No way to undo changes or restore previous versions
- **Desired Features:**
  - **Auto-save history:** Save each AI generation as a version
  - **Version list:** Show timestamps and descriptions
  - **Restore button:** Revert to any previous version
  - **Compare versions:** Side-by-side diff view
- **Database Schema:**
  ```prisma
  model ProjectVersion {
    id          String   @id @default(cuid())
    projectId   String
    project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
    files       Json     // Snapshot of all files
    description String?  // "Initial creation", "Added hero section", etc.
    createdAt   DateTime @default(now())
  }
  ```
- **UI Location:** Add "History" button in toolbar
- **Estimated Time:** 6-8 hours

---

### 5. **Interactive Demo Experience**
- **Status:** Pending
- **Priority:** High
- **Current Issue:** Demo allows building websites, confusing for visitors
- **Desired Behavior:**
  - **Auto-play walkthrough:**
    1. Page loads → Show welcome animation
    2. Auto-create sample project (no user input)
    3. Auto-fill planner questions with sample answers
    4. AI builds website automatically
    5. Show completed website in preview
    6. Display CTA: "Want to build your own? Sign in to get started!"
  - **No manual interaction:** Purely demonstrative
  - **Loop option:** Restart demo after completion
- **Implementation Plan:**
  ```typescript
  // New file: app/demo/page.tsx
  const DemoWalkthrough = () => {
    const [step, setStep] = useState(0)
    
    useEffect(() => {
      // Step 1: Welcome (2s)
      // Step 2: Create project (1s)
      // Step 3: Show questions + auto-answers (5s)
      // Step 4: Build website (10s)
      // Step 5: Show result + CTA (stays)
    }, [step])
    
    return (
      <div className="demo-walkthrough">
        {/* Animated step-by-step demo */}
      </div>
    )
  }
  ```
- **Estimated Time:** 8-10 hours

---

### 6. **Delete Project Functionality**
- **Status:** Pending
- **Priority:** Medium
- **Current Issue:** No way to delete unwanted projects from dashboard
- **Desired Features:**
  - **Delete button:** Add to project cards on dashboard
  - **Confirmation dialog:** "Are you sure you want to delete [Project Name]? This action cannot be undone."
  - **Soft delete option:** Move to trash/archive for 30 days before permanent deletion
  - **Bulk delete:** Select multiple projects and delete at once
- **UI Location:** 
  - Dashboard: Add trash icon next to edit button on each project card
  - Project page: Add delete option in settings/dropdown menu
- **Implementation:**
  ```typescript
  // Dashboard page - Add delete button
  <Button 
    variant="ghost" 
    size="sm"
    onClick={() => handleDeleteProject(project.id)}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
  
  // Confirmation dialog
  const handleDeleteProject = async (id: string) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      router.refresh()
    }
  }
  ```
- **Database:** Already has DELETE endpoint in `/api/projects/[id]/route.ts`
- **Estimated Time:** 1-2 hours

---

## ✅ Completed Features

### 1. **Qwen API Integration** (Feb 23, 2026)
- Added Qwen2.5-Coder as cheapest AI provider
- 7x cheaper than DeepSeek ($0.10/M vs $0.69/M)
- Integrated via OpenRouter API
- Available in AI provider dropdown

### 2. **Interactive Planner Questions** (Feb 23, 2026)
- Questions now shown one at a time
- Progress bar and question counter
- Previous/Next navigation buttons  
- Skip option for flexible planning
- Category-specific questions (business, ecommerce, general)
- Beautiful animated UI with smooth transitions

### 3. **Delete Project Functionality** (Feb 23, 2026)
- Added trash icon to project cards
- Double-click confirmation for safety
- Automatic refresh after deletion
- Visual feedback (button turns red on confirm)

### 4. **Planner-Controller Architecture** (Feb 23, 2026)
- Condensed planner conversation to 800 chars max
- Split building into 3 short tasks (~400 chars each)
- Fixed 404 errors from large HTTP requests
- Added real-time todo list progress display

### 5. **Content Security Policy Fix** (Feb 23, 2026)
- Added support for `cdnjs.cloudflare.com`
- Font Awesome and other CDN resources now load properly
- No more CSP violation errors in console

### 6. **Manual Save/Publish Button** (Feb 23, 2026)
- Publish button now saves project to database
- Visual feedback: Loading spinner → Checkmark → Reset
- Works alongside auto-save for manual control

### 7. **Cache Busting** (Feb 23, 2026)
- Generate unique build IDs with timestamps
- Force browser cache refresh on deployments
- Fixed "Failed to find Server Action" errors

### 8. **Database Path Fix** (Feb 23, 2026)
- Fixed "Unable to open database file" errors
- Changed to absolute path for production
- Improved reliability and stability

---

## 📊 Feature Priority Matrix

| Feature | Priority | Impact | Effort | Status |
|---------|----------|--------|--------|--------|
| Qwen API | High | High (cost savings) | Low | ✅ Complete |
| Version Control | High | High (UX) | High | Pending |
| Interactive Demo | High | High (conversions) | High | Pending |
| Delete Project | Medium | Medium (UX) | Low | ✅ Complete |
| Interactive Planner | Medium | Medium | Medium | ✅ Complete |
| Full-Page View | Low | Low | Low | Pending |

---

## 🚀 Quick Wins (< 2 hours each)

1. ✅ **Qwen API Integration:** Added cheapest AI option
2. ✅ **Delete Project:** Added trash button to dashboard project cards
3. ✅ **Interactive Planner:** One question at a time with progress tracking
4. **Full-Page Preview:** One button, instant value
5. **Better Error Messages:** User-friendly API error handling
6. **Keyboard Shortcuts:** Ctrl+S to save, Ctrl+B to build
7. **Project Templates:** One-click start for common website types

---

## 📝 Notes

### Database Changes Needed
- Add `ProjectVersion` model for version control
- Add `demoMode` flag to projects (to prevent demo saves)
- Add `changelog` field to track major edits

### API Endpoints to Create
- `POST /api/projects/{id}/versions` - Create new version
- `GET /api/projects/{id}/versions` - List all versions
- `POST /api/projects/{id}/restore/{versionId}` - Restore version
- `GET /api/providers` - List available AI providers with pricing

### Environment Variables to Add
```env
QWEN_API_KEY=your_key_here  # Via OpenRouter
OPENROUTER_API_KEY=your_key_here
```

---

## 🎨 UI/UX Improvements Backlog

- [ ] Delete project with confirmation dialog
- [ ] Bulk project operations (delete multiple, export multiple)
- [ ] Dark/Light theme toggle
- [ ] Drag-and-drop file upload for assets
- [ ] Code syntax highlighting in preview
- [ ] Mobile-responsive editor layout
- [ ] Collaborative editing (multiple users)
- [ ] Export to ZIP functionality
- [ ] Direct GitHub deployment
- [ ] Custom domain mapping
- [ ] Analytics dashboard
- [ ] Template marketplace

---

**Last Updated:** February 23, 2026
**Next Review:** March 1, 2026
