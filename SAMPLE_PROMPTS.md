# Sample Prompts for PDF Export MCP

Copy-paste these prompts to generate PDFs from your codebase.

---

## Code Analysis

**Security audit:**
```
Scan this Node.js project for common vulnerabilities (dependencies,
env handling, auth patterns). Create a security audit PDF with
severity ratings and remediation steps. Save to reports/security-audit.pdf
```

**Code review report:**
```
Analyze src/ for code quality issues, security concerns, and test
coverage gaps. Generate a PDF report with findings, severity levels,
and recommended fixes. Save to reports/code-review.pdf
```

**Tech debt report:**
```
Find all TODO and FIXME comments in the codebase and create a
tech debt PDF report grouped by priority. Save to reports/tech-debt.pdf
```

---

## Documentation

**API documentation:**
```
Read all route handlers in src/api/ and generate a PDF API reference
with endpoints, request/response examples, authentication requirements,
and error codes. Save to docs/api-reference.pdf
```

**Database schema:**
```
Read the migration files in db/migrations/ and create a PDF documenting
all tables, relationships, column types, and indexes. Save to docs/schema.pdf
```

**Onboarding guide:**
```
Explore this codebase and create an onboarding PDF for new developers:
project structure, setup instructions, architectural patterns, and
common gotchas. Save to docs/onboarding.pdf
```

---

## Reports

**Sprint summary:**
```
Analyze git commits from the last week and create a sprint summary PDF:
completed features, bug fixes, files changed, work in progress.
Save to reports/sprint-summary.pdf
```

**Release notes:**
```
Analyze all commits since the last git tag and create release notes PDF
for stakeholders. Group by: New Features, Improvements, Bug Fixes.
Write descriptions non-technical readers can understand. Save to reports/release-notes.pdf
```

**Dependency audit:**
```
Analyze package.json and create a PDF report: direct vs transitive
dependencies, outdated packages, known vulnerabilities, update
recommendations. Save to reports/dependency-audit.pdf
```

---

## Technical Documents

**Architecture Decision Record:**
```
I'm choosing PostgreSQL over MongoDB for our user service. Create an
ADR PDF with: context, options considered with pros/cons, decision
rationale, and consequences. Save to docs/adr-database-choice.pdf
```

**Migration plan:**
```
We need to migrate from Express to Fastify. Analyze current Express
usage and create a migration plan PDF: affected files, step-by-step
approach, risk areas, rollback strategy. Save to docs/migration-plan.pdf
```

**Incident postmortem:**
```
Create a postmortem PDF for yesterday's API outage:
- Timeline: 3:42 PM - 4:15 PM
- Impact: 500 errors on /checkout
- Root cause: DB connection pool exhaustion
Include relevant code snippets and action items. Save to reports/postmortem.pdf
```

---

## Automation Examples

**Daily standup (cron job):**
```bash
claude -p "Summarize my git commits from yesterday as a standup
  update PDF. Save to reports/standup-$(date +%Y%m%d).pdf"
```

**Weekly report with email:**
```bash
claude -p "Create a weekly progress report PDF from this week's
  commits. Save to reports/weekly.pdf" && \
  mail -s "Weekly Report" manager@company.com -A reports/weekly.pdf
```

**Pre-commit documentation:**
```bash
# In .git/hooks/pre-commit
claude -p "Update docs/api.pdf with current route handlers in src/api/"
```

