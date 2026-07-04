# AI Builder Platform

> Lovable-inspired AI-powered website builder with multi-provider AI integration, real-time preview, automated deployment, and credit-based pricing.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or use Prisma's local dev database)
- Redis (optional for development)

### Installation

```bash
# Install dependencies (already done)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

```
ai-builder/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard routes
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/                # Shadcn UI components
│   └── dashboard/         # Dashboard components
├── lib/                   # Utility libraries
│   ├── prisma.ts          # Database client
│   └── redis.ts           # Redis client
├── prisma/
│   └── schema.prisma      # Database schema
├── auth.ts                # NextAuth configuration
└── middleware.ts          # Auth middleware
```

## 🗄️ Database Schema

- **User**: Authentication, credits, profile
- **Project**: User projects with files
- **Deployment**: Subdomain/custom domain deployments
- **Transaction**: Credit purchases and usage
- **CustomDomain**: Domain verification and SSL

## 🔐 Authentication

NextAuth v5 with GitHub and Google OAuth providers.

To enable:
1. Create OAuth apps on GitHub/Google
2. Add credentials to `.env`
3. Sign in at `/auth/signin`

## 📦 Technologies

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5
- **UI**: Tailwind CSS + Shadcn/ui
- **Icons**: Lucide React

## 🛠️ Development Commands

```bash
# Run dev server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Create migration
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

## 📝 Development Roadmap

### ✅ Week 1-2: Foundation (CURRENT)
- [x] Initialize Next.js project
- [x] Set up Prisma schema
- [x] Implement NextAuth
- [x] Create landing page
- [x] Create dashboard layout

### 🔄 Week 3-4: Code Editor
- [ ] Add Monaco Editor
- [ ] File tree management
- [ ] Syntax highlighting

### 🔄 Week 5-6: AI Integration
- [ ] Multi-provider AI Gateway
- [ ] Cost calculator
- [ ] Credit system

### 🔄 Week 7-8: Live Preview
- [ ] Sandpack integration
- [ ] Responsive preview modes

### 🔄 Week 9-10: Deployment
- [ ] Docker + Traefik setup
- [ ] Subdomain deployment

### 🔄 Week 11-12: Launch
- [ ] Custom domains
- [ ] Stripe payments
- [ ] Production deployment

## 🎯 Current Status

**Week 1 Foundation Complete** ✅

Completed:
- Next.js 14 with TypeScript
- PostgreSQL + Prisma ORM
- NextAuth with GitHub/Google
- Landing page UI
- Dashboard layout
- Credit system database schema

Next: Add Monaco Editor integration (Week 3)

## 📞 Project Info

- **Status**: 🚧 In Development (Week 1/12)
- **Target Launch**: April 2026
- **Focus**: Landing pages and small websites with AI-generated code

## Recent Updates

### Create New Project Page
The following changes have been made to the "Create New Project" page:

1. **Mission, Vision, and About Us Fields**
   - Added a "Company Information" section with fields for:
     - Mission
     - Vision
     - About Us

2. **Website Structure Section**
   - Added a section to define the website structure:
     - Users can specify the number of pages (1-10).
     - Each page can be renamed using editable tabs.
   - Example: Home, About Us, Services, Contact.

3. **Template Selection**
   - Updated the "Choose a Template" section with selectable cards:
     - **Landing Page**: Start from scratch with empty files.
     - **Web**: Modern landing page with hero and features.
     - **Ecommerce**: Showcase a personal portfolio.

### General Improvements
- Enhanced the user interface for better usability.
- Improved form validation and dynamic updates for page names and templates.

### How to Use
1. Navigate to the "Create New Project" page.
2. Fill in the required fields, including company information, website structure, and template selection.
3. Submit the form to generate a new project with the specified details.

### Future Enhancements
- Add support for uploading logos and images.
- Integrate Google Maps for the location field.
- Enable multi-page generation with unique content for each page.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
