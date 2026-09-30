@AGENTS.md
#CLAUDE.md

#Engineering Principles

##Keep It Simple
- Always choose the simplest solution that satisfies the requirements.
- Never over-engineer when a straightforward approach exists.
- Avoid introducing unnecessary abstractions, patterns, or dependencies.
- Follow the KISS principle.
- while doumenting dont use '-' symbol

##Reuse Before Creating
- Always search the existing codebase before writing new code.
- Reuse existing utilities, services, components, helpers, and patterns whenever possible.
- Do not duplicate logic (DRY).

##No Hardcoding
- Never hardcode values that may change.
- Use configuration files, constants, enums, or environment variables.
- Avoid magic numbers and magic strings.

##Environment Variables
Never add a new environment variable without asking me first.

The env file is for deployment level values only:

- Secrets and credentials (API keys, database URLs, tokens).
- Values that differ per environment (local, staging, production).
- Values the process needs before it can reach the database (DB connection, broker URL, worker schedules).

Anything a business user or admin may want to change belongs in the database, not the env:

- Feature switches per tenant.
- Timings, delays, thresholds, and limits that are part of how a feature behaves.
- Anything that varies per tenant.
- Anything that would otherwise need a redeploy or a server restart to change.

Rules:

- Ask before introducing an env var. Explain why it cannot live in the database or in a constant.
- If the value belongs to a tenant, put it on the tenant configuration tables and reach it by foreign key.
- If the value never changes, it is a constant or an enum in `app/constants.py`, not an env var.
- Never add a temporary env var for testing. Change the stored configuration instead.
- Do not read env values inside request handlers or workers when a tenant scoped setting already exists.

Third party integration credentials (SMTP, APP_URL, EMAIL_FROM) are stored encrypted in the database and edited in the admin panel, not in `.env`; see docs/INTEGRATIONS.md.

##Database Safety
- **Never create or run database migrations without my explicit approval.**
- If a migration is required:
 - Explain why it is needed.
 - Describe exactly what will change.
 - Wait for my confirmation before generating or executing migration commands.

##Performance & Resource Usage
This application runs on a relatively small server.

- Do not arbitrarily increase payload limits, pagination sizes, upload limits, or batch sizes (e.g. 100+) without asking first.
- Prefer pagination over loading everything into memory.
- Avoid unnecessary background jobs, polling, excessive caching, or expensive database queries.
- Keep memory and CPU usage in mind when designing solutions.

##Documentation
Documentation is mandatory for non-trivial changes.

When making code changes:

- Update the relevant existing documentation if it exists.
- If introducing new functionality, create or update an appropriate `.md` file.
- Clearly document:
 - What was changed.
 - Why the change was made.
 - Any new functions, classes, services, or modules.
 - Any new API endpoints or request/response changes.
 - Configuration or environment variable changes.
 - Database changes (if any).
 - Breaking changes (if any).
 - Usage examples where appropriate.

Documentation should be written so another developer can understand the changes without reading the implementation.

##Before Writing New Code
Always ask yourself:

1. Can existing code solve this?
2. Can this be simpler?
3. Am I introducing unnecessary complexity?
4. Is anything hardcoded?
5. Will this increase server load?
6. Does this require a migration? If yes, ask first.
7. Does the documentation need updating?

##Code Quality
- Keep functions small and focused.
- Prefer readability over cleverness.
- Follow the existing project structure and coding style.
- Remove dead code instead of commenting it out.
- Avoid unnecessary dependencies.
- Keep commits and changes as small and focused as practical.

##Commits
Every commit message must record the time spent on that commit.

- Append the time to the end of the commit subject line as `-[21min]`.
- Use whole minutes below an hour, and hours plus minutes above it: `-[5min]`, `-[45min]`, `-[1h20min]`.
- The value is the time actually spent producing that commit, not an estimate of how long the work should have taken.
- Keep it on the subject line, not in the body, so `git log --oneline` shows it.
- If the time spent is not known, ask before committing instead of guessing.

Example:

```
fix: normalize uppercase slug routes before product lookup -[21min]
```

##Communication
Before making significant architectural or behavioral changes:

- Explain the approach first.
- Mention any trade-offs.
- Ask questions instead of making assumptions when requirements are unclear.

When completing a task, provide a concise summary including:

- Files modified.
- Files added.
- New functions/classes introduced.
- Existing functions modified.
- Any configuration changes.
- Any follow-up work or technical debt.

The goal is to leave the codebase cleaner, simpler, well-documented, maintainable, and easy for another engineer to understand.