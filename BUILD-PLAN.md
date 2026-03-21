# HelixPSA Build Plan

## Architecture
- **Stack:** Next.js 16 + React 19 + Tailwind 4 + TypeScript
- **Local dev:** /home/csimmons/.openclaw/workspace/psa-project/app/
- **GitHub:** https://github.com/donziguy/helixpsa
- **Deploy:** Docker on 172.16.33.206:3002, tunnel via helixpsa.anexio.co
- **Deploy creds:** csimmons@172.16.33.206 / Banditboy51##

## Build Queue (in order)

### Phase 1 — Core Pages (Sprint 1)
- [x] **1.1** Ticket dashboard (Kanban + list views) ✅
- [x] **1.2** Ticket detail panel (slide-out, timer, notes) ✅
- [x] **1.3** Drag-and-drop Kanban ✅
- [x] **1.4** Client page — list all clients, contact info, ticket counts, SLA health ✅
- [x] **1.5** Time tracking page — all time entries, daily/weekly totals, billable toggle ✅
- [x] **1.6** New ticket modal — Cmd+N shortcut, quick-create form with client/priority/assignee ✅

### Phase 2 — Interactivity & Polish (Sprint 2)
- [x] **2.1** Inline editing — click ticket title/description/priority to edit in-place ✅
- [x] **2.2** Ticket filters & search — filter by client, assignee, priority, status ✅
- [x] **2.3** Dashboard page — stats cards (open tickets, SLA breaches, hours today, revenue) ✅
- [ ] **2.4** Toast notifications — success/error feedback on actions
- [ ] **2.5** Keyboard navigation — j/k to move between tickets, Enter to open, arrow keys in Kanban

### Phase 3 — Data & Auth (Sprint 3)
- [ ] **3.1** PostgreSQL + Drizzle ORM schema (tickets, clients, users, time_entries, notes)
- [ ] **3.2** Auth.js setup — email/password login, session management
- [ ] **3.3** tRPC API layer — CRUD for tickets, clients, time entries
- [ ] **3.4** Real-time updates — WebSocket for ticket changes across tabs
- [ ] **3.5** Seed data — realistic MSP dataset for demo

### Phase 4 — Business Features (Sprint 4)
- [ ] **4.1** Billing page — invoice generation from time entries, hourly rates per client
- [ ] **4.2** SLA engine — configurable SLA policies per client/priority, breach alerts
- [ ] **4.3** Asset management page — devices, software, per-client inventory
- [ ] **4.4** Schedule/dispatch view — calendar with tech assignments
- [ ] **4.5** Reports page — charts for ticket volume, resolution time, revenue

### Phase 5 — AI & Advanced (Sprint 5)
- [ ] **5.1** AI ticket triage — auto-categorize, suggest priority/assignee
- [ ] **5.2** AI time suggestions — estimate time from ticket description
- [ ] **5.3** Knowledge base — searchable articles, link to tickets
- [ ] **5.4** Email-to-ticket — IMAP integration, auto-create tickets from client emails
- [ ] **5.5** Client portal — external view for clients to submit/track tickets

## Deploy Process
1. Build: `cd app && npx next build`
2. Git: `git add -A && git commit && git push`
3. Tar: `tar czf /tmp/helixpsa.tar.gz --exclude=node_modules --exclude=.next .`
4. SCP: `scp /tmp/helixpsa.tar.gz csimmons@172.16.33.206:/home/csimmons/helixpsa.tar.gz`
5. Remote: `cd /home/csimmons/helixpsa && tar xzf ... && docker build -t helixpsa:latest .`
6. Restart: `docker rm -f helixpsa helixpsa-tunnel && docker run ... (see deploy script)`

## Current Status
- **Last build:** v0.6 (2.1-2.2 complete — Phase 1 Sprint 1 COMPLETE ✅, Phase 2 partially complete)
- **Next up:** 2.3 (Dashboard page — stats cards (open tickets, SLA breaches, hours today, revenue))
