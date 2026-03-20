# 🚀 PSA — Professional Services Automation for MSPs

> What if Linear.app had a baby with ConnectWise, and the baby was raised by someone who actually runs an MSP?

An open-source PSA built for Managed Service Providers. Keyboard-first, AI-powered, zero bloat.

## Why?

Every MSP tech knows the pain: ConnectWise is slow, clunky, and expensive. Data entry takes forever. Time tracking is tedious. The UI feels like 2008.

We're building the PSA we wish existed.

## Design Principles

1. **Keyboard-first** — `/` to search, `n` for new ticket, `t` for time entry
2. **Command palette** — `Cmd+K` fuzzy search for everything
3. **Inline everything** — Change status, assignee, priority right from the list
4. **Smart defaults** — Auto-assign, auto-categorize, AI-suggested priority
5. **Speed** — Sub-100ms interactions. No loading spinners
6. **One-click time** — Timer starts when you open a ticket, tracks context switches

## Tech Stack

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes + tRPC
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Auth.js (NextAuth)
- **Real-time:** WebSockets
- **Deployment:** Docker + Cloudflare Tunnel

## Feature Roadmap

### Tier 1 — MVP
- [ ] Ticketing (Kanban + list view)
- [ ] Time tracking (auto-timer, billable/non-billable)
- [ ] Client/company management
- [ ] Billing & invoicing
- [ ] Technician dashboard
- [ ] Command palette (Cmd+K)
- [ ] Keyboard shortcuts

### Tier 2 — Growth
- [ ] SLA management
- [ ] Scheduling / dispatch
- [ ] Knowledge base
- [ ] Contact management
- [ ] Reporting & analytics
- [ ] Client portal

### Tier 3 — Differentiators
- [ ] AI ticket routing & triage
- [ ] Smart time suggestions
- [ ] RMM integrations (Automate, Datto, NinjaRMM)
- [ ] Automation workflows
- [ ] Email-to-ticket

### Tier 4 — Enterprise
- [ ] Procurement
- [ ] Project management
- [ ] Multi-tenant white-labeling
- [ ] Full CRM

## Development

```bash
# Coming soon — scaffolding the Next.js project
```

## License

TBD — Likely AGPL-3.0 or BSL

---

Built with ☕ and frustration with ConnectWise.
