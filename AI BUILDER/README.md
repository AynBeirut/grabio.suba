# AI Builder Platform - Complete Project Documentation

> Lovable-inspired AI website builder with multi-provider AI, real-time preview, VPS hosting, and credit-based pricing.

**Project Status:** 🚧 Week 1 Complete ✅ | **Target Launch:** April 2026

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Development Timeline](#development-timeline)
- [Quick Start](#quick-start)
- [Documentation](#documentation)

---

## 🎯 Project Overview

AI Builder is a SaaS platform that enables users to create websites through AI-powered conversations. Users chat with AI to generate code, see real-time previews, and deploy to production with custom domains—all from a single interface.

### Key Differentiators

1. **Multi-AI Provider** - Choose between GPT-4, Claude, DeepSeek based on budget
2. **Transparent Pricing** - See exact credit cost before each generation
3. **Self-Hosted** - Full control on Namecheap VPS infrastructure
4. **E-Commerce Ready** - AI generates Stripe integration, not just static sites
5. **Custom Domains Included** - Professional hosting with SSL automation

### Target Market

- **Primary:** Solo entrepreneurs, freelancers building landing pages
- **Secondary:** Small agencies creating client sites quickly
- **Year 1 Goal:** 30-100 active users

---

## ✨ Features

### Phase 1: MVP (Months 1-3) ✅ Week 1 Complete

#### Current (Week 1)
- [x] Next.js 14 with TypeScript & Tailwind
- [x] PostgreSQL + Prisma ORM
- [x] NextAuth (GitHub, Google OAuth)
- [x] Landing page & dashboard UI
- [x] Credit system database schema

#### Upcoming (Weeks 2-12)
- [ ] **Monaco Editor** - Code editing with syntax highlighting
- [ ] **AI Code Generation** - Multi-provider (OpenAI, Claude, DeepSeek, Copilot)
- [ ] **Live Preview** - Real-time Sandpack-powered preview
- [ ] **Cost Calculator** - Transparent credit display before generation
- [ ] **Subdomain Deployment** - `username.platform.com` hosting
- [ ] **Custom Domains** - DNS management via Namecheap API
- [ ] **Credit System** - Stripe payments with transaction tracking
- [ ] **Template Library** - Landing pages, portfolios, product pages

### Phase 2: Enhanced (Months 4-6)
- [ ] Component marketplace
- [ ] WordPress theme generator (optional fallback)
- [ ] Team collaboration
- [ ] Version control & rollbacks
- [ ] Advanced analytics

### Phase 3: Scale (Months 7-12)
- [ ] API for third-party integrations
- [ ] White-label reselling
- [ ] Multi-language support
- [ ] Mobile app builder

---

## 🏗️ Technology Stack

### Frontend
```
Next.js 14 (App Router)
React 18 + TypeScript
Tailwind CSS v4
Shadcn/ui components
Monaco Editor
Sandpack (preview)
Lucide React (icons)
```

### Backend
```
Next.js API Routes
PostgreSQL 15
Prisma ORM
Redis 7
Docker + Docker Compose
```

### AI Integration
```
Vercel AI SDK
OpenAI GPT-4 / GPT-3.5
Anthropic Claude 3.5
DeepSeek Coder
GitHub Copilot
```

### Infrastructure
```
Namecheap Quasar VPS (4 cores, 6GB RAM, $12.88/mo)
Docker Swarm
Traefik (reverse proxy + auto-SSL)
Let's Encrypt (SSL certificates)
```

### Payments & Auth
```
Stripe (credit purchases)
NextAuth v5 (OAuth)
```

---

## 🏛️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────┐
│              User Browser                         │
│   (React UI + Monaco + Live Preview)             │
└───────────────────┬──────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Next.js App       │
         │   (Frontend + API)  │
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐   ┌─────▼─────┐   ┌────▼─────┐
│   AI   │   │PostgreSQL │   │  Redis   │
│Gateway │   │  +Prisma  │   │  Cache   │
└───┬────┘   └───────────┘   └──────────┘
    │
    ├─► OpenAI API
    ├─► Claude API
    ├─► DeepSeek API
    └─► Copilot API

┌────────────────────────────────────────────────┐
│      Deployment (Namecheap VPS)                │
├────────────────────────────────────────────────┤
│  Docker + Traefik                              │
│  ├─ user1.platform.com (Nginx container)       │
│  ├─ user2.platform.com (Nginx container)       │
│  └─ Custom domains with auto-SSL              │
└────────────────────────────────────────────────┘
```

### Database Schema

**Core Tables:**
- `User` - Auth, credits (default 10), profile
- `Project` - Files (JSON), framework, user relationship
- `Deployment` - Subdomain, custom domain, container ID, status
- `Transaction` - Credit purchases/deductions, balance tracking
- `CustomDomain` - DNS verification, SSL status

**Auth Tables:**
- `Account` - OAuth provider accounts
- `Session` - Active sessions
- `VerificationToken` - Email verification

---

## 📅 Development Timeline (3 Months)

### ✅ Month 1: Foundation & Editor (Current)

**Week 1-2: Core Platform** ✅ COMPLETE
- [x] Next.js + TypeScript + Tailwind setup
- [x] PostgreSQL + Prisma schema
- [x] NextAuth OAuth (GitHub/Google)
- [x] Landing page + dashboard UI
- [x] Docker dev environment

**Week 3-4: Code Editor**
- [ ] Monaco Editor integration
- [ ] File tree component
- [ ] Project CRUD operations
- [ ] Syntax highlighting + autocomplete

### 🔄 Month 2: AI & Preview

**Week 5-6: AI Integration**
- [ ] Multi-provider AI Gateway (Vercel AI SDK)
- [ ] Streaming chat interface
- [ ] Cost calculator (real-time credit estimation)
- [ ] Redis rate limiting
- [ ] Model selection UI (DeepSeek/GPT-4/Claude)

**Week 7-8: Live Preview**
- [ ] Sandpack integration (iframe sandbox)
- [ ] Responsive preview modes (mobile/tablet/desktop)
- [ ] ESLint validation pipeline
- [ ] Template library (landing pages, portfolios)

### 🚀 Month 3: Deployment & Launch

**Week 9-10: Multi-Tenant Hosting**
- [ ] Traefik reverse proxy + auto-SSL
- [ ] Docker container deployment pipeline
- [ ] Subdomain routing (`*.platform.com`)
- [ ] Deployment dashboard (logs, rollback)

**Week 11-12: Domains & Payments**
- [ ] Namecheap API (DNS management)
- [ ] Custom domain verification (TXT records)
- [ ] Stripe credit purchases ($10/100 credits)
- [ ] Usage analytics dashboard
- [ ] Security audit + load testing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone repository
cd "AI BUILDER/ai-builder"

# Install dependencies (already done if following from setup)
npm install

# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run dev
```

Visit **http://localhost:3000**

### Required Configuration

1. **Generate NextAuth Secret**
```bash
openssl rand -base64 32
```
Add to `.env` as `NEXTAUTH_SECRET`

2. **GitHub OAuth** (Required for sign-in)
   - Create OAuth App: https://github.com/settings/developers
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
   - Add credentials to `.env`

3. **Google OAuth** (Optional)
   - Create OAuth Client: https://console.cloud.google.com/
   - Authorized redirect: `http://localhost:3000/api/auth/callback/google`
   - Add credentials to `.env`

---

## 📚 Documentation

### Quick References
- **[QUICKSTART.md](ai-builder/QUICKSTART.md)** - Complete setup guide with OAuth instructions
- **[PROGRESS.md](ai-builder/PROGRESS.md)** - Detailed development log
- **[README.md](ai-builder/README.md)** - Technical project documentation

### Key Files
- **[schema.prisma](ai-builder/prisma/schema.prisma)** - Database models
- **[auth.ts](ai-builder/auth.ts)** - NextAuth configuration
- **[docker-compose.dev.yml](ai-builder/docker-compose.dev.yml)** - Local services

---

## 💰 Business Model

### Credit-Based Pricing (100% Markup)

| AI Model | Credits | User Cost | Provider Cost | Margin |
|----------|---------|-----------|---------------|--------|
| DeepSeek Coder | 1 | $0.10 | $0.05 | 100% |
| GPT-4o-mini | 3 | $0.30 | $0.15 | 100% |
| Claude 3.5 | 8 | $0.80 | $0.40 | 100% |
| GPT-4 | 10 | $1.00 | $0.50 | 100% |

### Credit Packages
- **$10** = 100 credits
- **$50** = 600 credits (+20% bonus)
- **$100** = 1,300 credits (+30% bonus)

### Tiered Access
- **Free Tier:** 10 credits/day, static sites only, subdomain hosting
- **Basic ($9/mo):** 100 credits, custom domains, priority support
- **Pro ($29/mo):** 500 credits, WordPress access, white-label option

### Projected Economics (30 Users, Year 1)
- **Revenue:** $870/month (30 × $29 average)
- **Infrastructure:** $13/month (Quasar VPS)
- **AI Costs:** $15/month (with DeepSeek primary)
- **Net Margin:** ~$840/month (~97%)

---

## 🛠️ Development Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run start                  # Production server

# Database
npx prisma studio              # Database GUI (port 5555)
npx prisma migrate dev         # Create migration
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema (no migration)

# Docker
docker-compose -f docker-compose.dev.yml up -d      # Start services
docker-compose -f docker-compose.dev.yml down       # Stop services
docker-compose -f docker-compose.dev.yml logs -f    # View logs
docker ps                                           # List containers

# Utilities
npm run lint                   # ESLint check
npm run format                 # Prettier format
```

---

## 🔐 Security Considerations

### AI Cost Protection
- Hard daily spending cap: $5/day
- Per-user rate limiting (Redis-based)
- Credit balance validation before requests
- Request queuing to prevent duplicates

### Multi-Tenant Isolation
- Docker container resource limits (512MB RAM, 0.5 CPU)
- Network isolation between containers
- Sandboxed iframe preview with CSP headers
- Code scanning for malicious patterns

### Authentication
- OAuth 2.0 (GitHub, Google)
- JWT session tokens
- API key rotation
- Webhook signature verification (Stripe)

---

## 📊 Infrastructure Plan

### Development (Current)
- **Local:** Docker Compose (PostgreSQL + Redis)
- **Database:** Prisma local dev or Docker PostgreSQL
- **Editor:** VS Code with Prisma, ESLint extensions

### Staging (Month 2)
- **VPS:** Namecheap Quasar ($12.88/mo)
- **Services:** Docker Swarm
- **Domain:** staging.yourplatform.com

### Production (Month 3)
- **VPS:** Namecheap Quasar (scale to Magnetar if needed)
- **Deployment:** Docker + Traefik + Let's Encrypt
- **Monitoring:** Sentry (errors) + PostHog (analytics)
- **Backups:** Daily VPS snapshots ($2-5/mo)

### Scaling Path
- **30-50 users:** Quasar VPS (6GB RAM) - $12.88/mo
- **50-100 users:** Magnetar VPS (12GB RAM) - $24.88/mo
- **100+ users:** Multi-VPS or managed Kubernetes

---

## 🎯 Success Metrics

### Technical Milestones
- [x] Week 1: Foundation complete ✅
- [ ] Week 4: Code editor functional
- [ ] Week 6: AI generation working
- [ ] Week 8: Live preview operational
- [ ] Week 10: Deployment pipeline ready
- [ ] Week 12: Production launch 🚀

### Business Goals (Year 1)
- **Month 3:** 10 beta users
- **Month 6:** 30 paying users
- **Month 12:** 100 active users
- **Revenue Target:** $2,900/month by Month 12

### User Satisfaction
- **AI Generation Success Rate:** >90%
- **Deployment Success Rate:** >95%
- **Average Response Time:** <2 seconds
- **Customer Support:** <4 hour response time

---

## 🤝 Contributing

This is currently a solo project. Contributions welcome after MVP launch (Month 4+).

### Development Workflow
1. Create feature branch from `main`
2. Implement feature with tests
3. Submit PR with description
4. Code review + merge

---

## 📞 Support & Contact

- **Status:** In Development (Week 1/12)
- **Launch:** Target April 2026
- **Stack:** Next.js 14, PostgreSQL, Docker, Traefik
- **Hosting:** Namecheap VPS

---

## 📄 License

[To be determined - likely MIT or proprietary]

---

## 🙏 Acknowledgments

- Inspired by [Lovable.dev](https://lovable.dev)
- Built with [Vercel AI SDK](https://sdk.vercel.ai)
- Powered by [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- Preview by [Sandpack](https://sandpack.codesandbox.io/)
- UI Components by [Shadcn/ui](https://ui.shadcn.com/)

---

**Last Updated:** January 28, 2026
**Version:** 0.1.0-alpha (Week 1)
**Status:** 🚧 Foundation Complete, Editor Integration Next
