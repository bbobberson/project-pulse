# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Production server**: `npm start`
- **Linting**: `npm run lint`

## Architecture Overview

Project Pulse is a project management dashboard built with Next.js 15, React 19, Supabase (PostgreSQL + Auth), and deployed on Vercel. It provides PM tools for tracking projects, client portals for viewing progress, and token-based client access without authentication.

### Core Architecture

**Authentication & User Management:**
- Uses Supabase Auth for authentication (not NextAuth/Prisma despite schema presence)
- Two user types: `pm_users` (admins/PMs) and client access via tokens
- User creation flow: invitation → auth user → pm_users record via webhook
- Admin users can manage all projects; PM users manage their own projects

**Database Design:**
- Primary backend: Supabase (PostgreSQL) with Row Level Security (RLS)
- Key tables: `pm_users`, `pm_invitations`, `projects`, `client_access_tokens`, `weekly_snapshots`, `project_roadmap`, `task_templates`
- Note: `projects.id` uses `text` type (not UUID) - important for foreign key relationships
- Prisma schema exists but is not actively used (legacy from NextAuth implementation)

**Client Access System:**
- Token-based client access via `client_access_tokens` table
- Clients access projects through `/client?token=<token>` without authentication
- Tokens have expiration dates and track usage via `last_accessed` timestamps
- Token validation happens in `/api/validate-token` endpoint

**API Architecture:**
- Server-side API routes use async `supabase()` function from `@/lib/supabase-server`
- Browser-side components use direct import from `@/lib/supabase-browser`
- Authentication webhook at `/api/auth/webhook` handles user registration flow

### Key Components

**Project Management:**
- Dashboard at `/dashboard` shows user's projects
- Project creation, editing, and roadmap management
- Task templates system with drag-and-drop roadmap builder using `@dnd-kit`
- Weekly pulse updates stored in `weekly_snapshots` with JSONB task data

**Client Portal:**
- Token-based access at `/client` route
- Project roadmap view at `/client/[projectId]/roadmap`
- Real-time project updates without authentication required

**Design System:**
- Tesla-inspired clean UI with Framer Motion animations
- Tailwind CSS for styling
- Custom InfoWorks branding components

### Environment Configuration

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public API key  
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key for server operations
- `NEXT_PUBLIC_BASE_URL` - Production base URL (for correct token link generation)

### Deployment

**Production Deployment:**
- Deployed on Vercel via GitHub Actions
- Tag-based deployment: push git tags (e.g. `v1.0.0`) to trigger production deployment
- Workflow file: `.github/workflows/deploy-prod.yml`
- Production URL: `https://project-pulse-flax.vercel.app`

**Database Management:**
- Separate Supabase projects for dev and production
- Manual SQL migrations (no automated migration system)
- RLS policies require careful management for proper access control

### Data Flow Patterns

**User Registration:**
1. Admin creates invitation in `pm_invitations`
2. User signs up via Supabase Auth
3. Webhook triggers `handle_new_pm_user()` function
4. Creates corresponding `pm_users` record

**Client Access:**
1. PM generates token via `/api/client-tokens`
2. Token stored in `client_access_tokens` with project association
3. Client accesses `/client?token=<token>`
4. Token validated via `/api/validate-token`
5. Client views project data without authentication

**Project Updates:**
- Weekly snapshots stored with structured task data (completed/in-progress/blocked)
- JSONB format allows flexible data structure for different update types
- Client portal consumes this data for progress visualization

### Important Notes

- Always use the async `supabase()` function in server-side code
- Database `project_id` fields are `text` type, not UUID
- RLS policies can cause infinite recursion - keep them simple
- Client portal must work without authentication (token-based only)
- Production database schema must match development for deployments to succeed