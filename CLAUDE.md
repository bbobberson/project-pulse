# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm run dev` (may start on port 3001+ if 3000 is occupied)
- **Build for production**: `pnpm run build`
- **Production server**: `pnpm start`
- **Linting**: `pnpm run lint`
- **Package management**: Uses `pnpm` exclusively - never mix npm/yarn commands
- **Clean development**: Delete `.next` folder and restart if encountering compilation issues
- **Cache cleanup**: Remove `node_modules/.cache` if experiencing persistent build issues

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
- Tesla-inspired roadmap view at `/client/[projectId]/roadmap` with collapsible weeks
- Historical update navigation with timeline scrubber
- Download functionality for roadmap data (JSON export)

**Dual-Mode Dashboard System:**
- **Present Mode**: Clean, production-ready interface (`PresentModeDashboard.tsx`)
- **Future Mode**: Cosmic, animated interface (`FutureModeUniverse.tsx`) with floating project cards
- Mode toggle via clickable InfoWorks logo (easter egg functionality)
- **Immersive Mode**: Full-screen project detail view within Future Mode
- Conditional loading messages based on active mode

**Design System:**
- **Present Mode**: Tesla-inspired clean UI with professional styling, Inter font
- **Future Mode**: Cosmic interface with Orbitron font for futuristic elements
- Framer Motion animations throughout (hover: scale 1.02, tap: scale 0.98)
- Custom InfoWorks branding components with animated SVG logo
- Consistent #1C2B45 brand color for primary buttons
- All clickable elements must have `cursor-pointer` class
- Status indicators use color-coded pills (green/yellow/red) with proper contrast

### Environment Configuration

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public API key  
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key for server operations
- `NEXT_PUBLIC_BASE_URL` - Production base URL (for correct token link generation)

### Deployment

**Complete Dev/Prod Deployment Process:**

#### Environment Setup
**Development Environment:**
- Supabase project: `project-pulse` (wryhewzgpfzfkarxiwrc.supabase.co)
- Environment: `.env.local` file with dev credentials
- URL: `http://localhost:3000` (or 3001+ if port occupied)

**Production Environment:**
- Supabase project: `project-pulse-prod` (xuwzohxgnyvbijpuipkh.supabase.co) 
- Environment: Vercel environment variables
- URL: `https://project-pulse-flax.vercel.app`

#### Production Deployment Process

1. **Database Schema Sync (CRITICAL FIRST STEP):**
   ```sql
   -- In production Supabase SQL Editor, run:
   -- 1. safe_production_migration.sql (creates all tables and schema)
   -- 2. Any additional migration files as needed
   ```

2. **Vercel Environment Variables (Required):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xuwzohxgnyvbijpuipkh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod anon key]
   SUPABASE_SERVICE_ROLE_KEY=[prod service role key]
   RESEND_API_KEY=re_JD9CqKw6_CwFxee8pckehyuirQD7QT9rD
   NEXT_PUBLIC_BASE_URL=https://project-pulse-flax.vercel.app
   ```

3. **Supabase Auth Configuration (Production):**
   - Site URL: `https://project-pulse-flax.vercel.app`
   - Redirect URLs: 
     - `https://project-pulse-flax.vercel.app/auth/reset-password-callback`
     - `https://project-pulse-flax.vercel.app/auth/login`
     - `https://project-pulse-flax.vercel.app/**`

4. **Code Deployment:**
   ```bash
   # Commit changes
   git add .
   git commit -m "description of changes"
   git push origin main
   
   # Tag for deployment (triggers GitHub Actions)
   git tag v2.1.X  # increment version number
   git push origin v2.1.X
   ```

5. **Manual Deployment (if GitHub Actions fails):**
   - Go to Vercel Dashboard → project-pulse → Deployments
   - Click "Redeploy" on latest deployment
   - Ensure it uses latest commit from main branch

#### Email System Configuration
**Resend Setup:**
- Domain: `send.rothman.fit` (subdomain approach required)
- From address: `pulse@send.rothman.fit`
- DNS records configured in Namecheap for domain verification

**Email Flow:**
- Pulse updates automatically generate fresh client access tokens
- Emails sent with secure portal links using new tokens
- Rate limiting: 600ms delay between emails (respects 2 req/sec limit)

#### Database Management Philosophy
**Separate Databases:**
- **Development**: For testing, development, and experimentation
- **Production**: For live client data and real project management

**Migration Process:**
1. Develop and test schema changes in dev database
2. Apply tested migrations to production database via SQL Editor
3. Deploy code that uses the updated schema
4. **NEVER deploy code without database schema being in sync**

**Key Tables:**
- `projects` - Project data (id field is TEXT type, not UUID)
- `client_users` - Client contact info with email notification preferences  
- `client_access_tokens` - Secure tokens for client portal access
- `weekly_snapshots` - Pulse update data and progress reports
- `project_roadmap` - Task management and milestone tracking

#### Troubleshooting Common Issues
**Email API Returns 404:**
1. Verify Vercel deployment completed successfully
2. Check all Supabase environment variables match production project
3. Confirm database migration applied (check for `client_users` table)

**Token Generation Fails:**
1. Check `client_users` table exists with proper schema
2. Verify `email_notifications: true` for target project clients
3. Ensure `client_name` field is not null in token creation

**Database Connection Issues:**
1. Verify production Supabase URLs and keys in Vercel env vars
2. Check RLS policies allow proper access
3. Confirm service role key has necessary permissions

#### Deployment History
- v2.1.3: Fixed TypeScript compilation errors
- v2.1.4: Added email notification system
- v2.1.5: Manual deployment workflow
- v2.1.6: Automatic token generation during pulse updates  
- v2.1.7: Fixed client_name field in token creation API

**GitHub Actions Status:**
- File: `.github/workflows/deploy-prod.yml`  
- **Known Issue**: Uses `npm` but project uses `pnpm`
- Fallback: Manual Vercel deployment via dashboard
- Monitor: `https://github.com/bbobberson/project-pulse/actions`

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

### Dashboard Architecture

**Mode Management:**
- Dashboard state managed by `dashboardMode` variable (`'present' | 'future'`)
- Present Mode renders `PresentModeDashboard` component
- Future Mode renders `FutureModeUniverse` component with optional immersive view
- Both modes share same data sources and API endpoints

**Component Communication:**
- Logo click handlers pass mode toggle functions between parent/child components
- Onboarding modal conditionally renders based on mode (disabled in Future Mode for testing)
- Shared project data flows through props to both dashboard implementations

### Important Notes

- Always use the async `supabase()` function in server-side code
- Database `project_id` fields are `text` type, not UUID
- RLS policies can cause infinite recursion - keep them simple
- Client portal must work without authentication (token-based only)
- Production database schema must match development for deployments to succeed
- Future Mode immersive view uses `enterImmersiveMode(project)` for navigation
- Package manager: uses `pnpm` - ensure `pnpm-lock.yaml` stays synchronized with `package.json`

### Project Navigation Architecture

**Recent UX Improvements (Present Mode Only):**
- **Whole card clickable**: Project cards navigate to `/dashboard/[projectId]` details page with subtle lift hover effect
- **Streamlined actions**: Removed redundant action cards from project details page 
- **Primary action bar**: Update Pulse (brand color) and Roadmap buttons moved to top action bar alongside status
- **Update Pulse consistency**: Lightning icon integrated inside button across dashboard and project pages
- **Tesla-inspired navigation**: All "Back to Dashboard" links use consistent button styling with chevron icons
- **Enhanced UX patterns**: Loading spinners, toast notifications, keyboard navigation, contextual empty states
- **Inline editing system**: Complete project details editing with visual feedback, team member autocomplete, and keyboard shortcuts

**Route Structure:**
- `/dashboard` - Main dashboard (Present/Future mode toggle)
- `/dashboard/[projectId]` - **NEW**: Project details page (read-only view with actions)
- `/dashboard/[projectId]/edit` - **LEGACY**: Full project editing (still used by some flows)  
- `/dashboard/[projectId]/update-pulse` - Weekly progress updates
- `/dashboard/[projectId]/roadmap` - Task management with drag-and-drop
- `/dashboard/[projectId]/client-access` - **LEGACY**: Client token management (moved to details page)
- `/client/[projectId]/roadmap` - **NEW**: Tesla-inspired client roadmap with collapsible weeks

### Present Mode UI Consistency Rules

**Header Pattern (All Project Pages):**
- InfoWorks logo on right, consistent spacing and sizing
- "Back to Dashboard" Tesla-inspired button: `bg-gray-100 text-gray-700 rounded-lg` with chevron icon
- Title uses `text-3xl font-bold`, subtitle uses `text-gray-600 mt-1` 
- Divider line between back button and title section

**Background & Layout:**
- **CRITICAL**: Present Mode uses `bg-gray-50` background, NOT black
- White cards with `border border-gray-200` and `shadow-sm`
- Professional gray text hierarchy (`text-gray-900`, `text-gray-600`, `text-gray-500`)
- Brand color `#1C2B45` for primary actions only

**Button & Form Styling:**
- Primary buttons: Brand color `#1C2B45` with `hover:opacity-90` and motion animations
- Secondary buttons: `bg-gray-100 text-gray-700` with `hover:bg-gray-200`  
- Input fields: `px-4 py-3` padding with `border border-gray-300` and `focus-brand` (uses #1C2B45)
- Dropdowns: Custom SVG arrow positioned `right_12px_center` with `pr-10` padding  
- Motion animations: `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` throughout
- Team member autocomplete with smart suggestions from previous projects
- Toast notifications for user feedback with auto-dismiss

**Status Management:**
- Status pills: `bg-green-100 text-green-800` (on-track), `bg-yellow-100 text-yellow-800` (at-risk), `bg-red-100 text-red-800` (off-track)
- Pills must not wrap (`whitespace-nowrap`) 
- Use flex layout with `flex-shrink-0` for status containers
- Replace "All Status" with "Show All" in filters

### Future Mode Sacred Design Elements (NEVER CHANGE)

**From REVOLUTIONARY_DESIGN_RULES.md (Git commit: 2b180e2):**
- Black cosmic void background with glass morphism effects
- "Your Universe" 8xl/9xl title with Orbitron font
- Magnetic proximity interactions with subtle floating animations
- Bottom-positioned search with "Search the cosmos..." placeholder
- Dynamic card sizing based on project count and status
- Status-driven color gradients (emerald, amber, rose)
- Cosmic particles and gentle magnetic pull toward cursor
- **Never use these elements in Present Mode**

### Development Patterns

**Supabase Integration:**
- Server-side: Use async `supabase()` from `@/lib/supabase-server`
- Client-side: Direct import from `@/lib/supabase-browser`
- Database `project_id` fields are `text` type, not UUID
- RLS policies can cause infinite recursion - keep them simple

**Component Architecture:**
- Present Mode: `PresentModeDashboard.tsx` - Tesla-inspired clean UI
- Future Mode: `FutureModeUniverse.tsx` - Cosmic interface with immersive view
- Shared: Both modes use same data sources and API endpoints
- Mode toggle via clickable InfoWorks logo (easter egg functionality)

**Package Management:**
- Uses `pnpm` as package manager
- Ensure `pnpm-lock.yaml` stays synchronized with `package.json`
- Never mix npm/yarn commands with pnpm project

### Week Number Calculation

**Critical Implementation Details:**
- Week numbers are calculated based on project `start_date`, not calendar weeks
- Formula: `Math.max(1, Math.ceil(daysDiff / 7))` where `daysDiff` is days since project start
- Week 1 = first 7 days of project, Week 2 = days 8-14, etc.
- This calculation is used in `/dashboard/[projectId]/update-pulse` for creating snapshots
- Ensures consistent week numbering across project lifecycle

### Pulse Update System

**Snapshot Creation Logic:**
- Each "Update Pulse" action creates a NEW `weekly_snapshots` record (no deduplication)
- Multiple updates per day/week are preserved as separate snapshots
- Snapshots include: `project_id`, `week_number`, `week_start_date`, `tasks_data` (JSONB), `overall_status`
- Client portal displays all snapshots in chronological order (newest first)

**Critical Bug Fixes Applied:**
- ✅ **Week calculation**: Fixed from hardcoded week 1 to dynamic calculation based on project start
- ✅ **Snapshot deduplication**: Removed logic that was overwriting existing snapshots
- ✅ **Client historical view**: Implemented Tesla-inspired navigation for viewing all past reports

### Client Portal Historical Navigation

**Tesla-Inspired Design Pattern:**
- **No modals**: All navigation happens inline on the same page
- **Previous/Next arrows**: Left arrow = older reports, right arrow = newer reports
- **Timeline scrubber**: Interactive progress bar with clickable dots for each report
- **Report counter**: Shows current position (e.g., "2 of 5")
- **Date & time display**: Shows both date and time to differentiate multiple daily updates

**Navigation State Management:**
- Uses `currentReportIndex` (0 = newest, higher = older)
- All report content dynamically updates based on `snapshots[currentReportIndex]`
- Timeline tooltips show full datetime on hover
- Smooth transitions between reports without page reloads

### Client Roadmap Architecture

**Tesla-Inspired Roadmap Features (Latest):**
- **Collapsible weeks system**: Each week can be expanded/collapsed with smart auto-collapse for completed weeks
- **Progress overview dashboard**: Summary cards showing completed/in-progress/upcoming/blocked task counts
- **Task detail cards**: Milestone indicators, assigned team members, estimated hours, and status pills
- **Download functionality**: JSON export of complete roadmap data structure
- **Responsive week detection**: Auto-highlights current week based on project start date
- **Smart collapsing logic**: Automatically collapses completed weeks (except recent ones) on load

**Implementation Details:**
- Uses `collapsedWeeks` Set state to track which weeks are collapsed
- `getCurrentWeek()` calculates current week from project start date
- `toggleWeekCollapse()` handles expand/collapse functionality
- `downloadRoadmap()` generates JSON export with project and task data
- Auto-collapse logic runs on component mount with setTimeout to avoid state conflicts

### Email Notification System

**Resend Integration (September 2025):**
- Client pulse notifications implemented using Resend API
- Clean email template with greeting, portal link, and professional sign-off
- Only sends to active client users with `email_notifications: true`
- API route: `/api/send-pulse-notification`
- Integrated into pulse update flow (automatic after snapshot creation)

**Production Deployment Requirements:**
- ✅ **Environment Variables**: Add to Vercel dashboard under Settings → Environment Variables
  - `RESEND_API_KEY=re_JD9CqKw6_CwFxee8pckehyuirQD7QT9rD` - Resend API key for email functionality
- ✅ **Domain Verification**: Custom subdomain `send.rothman.fit` verified with Resend for production emails
- ✅ **Email Configuration**: Emails sent from `pulse@send.rothman.fit` with professional branding
- ✅ **Rate Limiting**: 600ms delay between emails to respect Resend's 2 req/sec limit
- ✅ **Multi-recipient Support**: Can send to any email address with verified domain

**DNS Configuration (Critical):**
- **Subdomain approach required**: Use `send.rothman.fit` subdomain, NOT root domain
- **Namecheap DNS records**: 
  - MX Record: Host = `send`, Value = `feedback-smtp.us-east-1.amazonses.com`, Priority = 10
  - TXT SPF: Host = `send`, Value = `v=spf1 include:amazonses.com ~all`
  - TXT DKIM: Host = `resend._domainkey.send`, Value = (Resend-provided DKIM key)
- **Common issues**: Root domain DNS verification fails; always use subdomain approach
- **Verification time**: Can take 15 minutes to 24 hours for DNS propagation

### Favicon Configuration

**Next.js 15 Icon System:**
- Custom InfoWorks favicon with Project Pulse branding located at `/src/app/favicon.ico`
- SVG version available at `/public/favicon.svg` with InfoWorks "i" logo and pulse wave
- Configured via metadata in `layout.tsx` - avoid manual `<link>` tags in `<head>`
- Clear `.next` cache if favicon changes don't appear

### Known Issues to Address

- Client access URLs may generate with wrong port (3000 vs actual dev port)  
- Legacy edit page `/dashboard/[projectId]/edit` still exists alongside new details page
- Download currently exports JSON - should be upgraded to PDF format
- Gmail + nodemailer invitation system not working reliably (manually adding PMs to DB)
- **Resend DNS complexity**: Email service has caused multiple production delays due to DNS verification issues

### Troubleshooting Common Deployment Issues

**Email API Returns 404 in Production:**
1. Check GitHub Actions workflow ran successfully
2. Verify database migration was applied (check for `client_users` table)
3. Add `RESEND_API_KEY` environment variable in Vercel dashboard
4. GitHub Actions uses `npm` but project uses `pnpm` - may need manual Vercel deployment

**Database Schema Mismatch:**
1. Always apply `safe_production_migration.sql` before deploying
2. Production `projects.id` is `text` type, not `uuid`
3. All foreign keys must match production schema types

**GitHub Actions Not Triggering:**
1. Check workflow file uses correct package manager (`pnpm` not `npm`)
2. Verify GitHub secrets are configured (VERCEL_TOKEN, etc.)
3. Monitor at: `https://github.com/bbobberson/project-pulse/actions`

### Recent Major Enhancements

**Dashboard UX Improvements:**
- Loading spinners on navigation buttons with proper disabled states
- Toast notification system for user feedback (success/error states)
- Keyboard navigation: arrow keys to navigate cards, Enter to select, Escape to exit
- Contextual empty states with actionable recovery buttons
- Enhanced card hover effects with subtle lift animation

**Project Details Enhancements:**  
- Inline editing system with visual feedback (green border flash on save)
- Team members as smart tag system with autocomplete from previous projects
- Action bar consolidation: Update Pulse and Roadmap moved above Project Info card, right-aligned
- Consistent Tesla-inspired button styling across all navigation elements
- Professional error handling with loading states and user feedback
- Status dropdown moved to Project Information card header for contextual placement

**Client Portal Revolutionary Redesign:**
- **Historical report access**: Tesla-style inline navigation replacing modal approach
- **Timeline-based browsing**: Interactive scrubber with clickable timeline dots
- **Multiple updates per day**: Proper support with time display alongside dates
- **Smooth transitions**: No page reloads when switching between historical reports
- **Week number accuracy**: Fixed calculation based on actual project timeline
- **Status display optimization**: Single status pill in Project Overview card to avoid redundancy

**Brand Consistency Implementation:**
- **Tagline standardization**: "Transparency. Delivered." implemented across all client-facing pages
- **Logo consistency**: InfoWorks logo properly positioned in headers across all interfaces
- **Email branding**: Custom domain `rothman.fit` configured for professional email delivery
- **Authentication flow**: Complete Tesla-inspired password reset system with Supabase integration

### Branding Guidelines

**Official Tagline:** "Transparency. Delivered."
- Used consistently across login, forgot password, reset password, and client portal pages
- Replaces various inconsistent taglines throughout the application
- Should appear as subtitle under "Project Pulse" in authentication flows

**Navigation Patterns:**
- **Roadmap page**: "Back to Project Details" (not Dashboard) for proper flow context
- **Project details**: Action buttons positioned above content cards, right-aligned to card width
- **Client portal**: Single status display in Project Overview card header
- **Header consistency**: Clean separation between navigation and content across all pages

### Custom Domain Setup Guide

**Domain Configuration Process:**

**Step 1: Domain Selection**
- Recommended: `pulse.rothman.fit` (subdomain of existing domain)
- Benefits: Cost-effective, matches email domain branding, faster DNS propagation

**Step 2: Vercel Configuration**
1. Go to Vercel Dashboard → project-pulse → Settings → Domains
2. Add domain: `pulse.rothman.fit`
3. Vercel will provide DNS record details

**Step 3: DNS Configuration (Namecheap)**
- Type: CNAME
- Host: `pulse`
- Value: `cname.vercel-dns.com` (use exact value from Vercel)
- TTL: Automatic (or 300 seconds)

**Step 4: Environment Variable Updates**
Update in Vercel Dashboard → Settings → Environment Variables:
```bash
NEXT_PUBLIC_BASE_URL=https://pulse.rothman.fit
```
Redeploy after updating environment variables.

**Step 5: Supabase Auth Configuration**
Update in Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://pulse.rothman.fit`
- Redirect URLs: 
  - `https://pulse.rothman.fit/auth/callback`
  - `https://pulse.rothman.fit/auth/reset-password-callback`

**Step 6: Verification & Testing**
- DNS propagation can take 15 minutes to 24 hours
- Test password reset emails use new domain
- Verify client access tokens generate correct URLs
- SSL certificate automatically provisioned by Vercel

**Professional Benefits:**
- Professional URL replaces `project-pulse-flax.vercel.app`
- Brand consistency with `send.rothman.fit` email domain
- Enhanced client trust and professional appearance
- SEO benefits with custom domain authority