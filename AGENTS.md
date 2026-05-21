<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:sentry-auto-fix -->
# Auto-fix Sentry errors (on-demand)

When the user says "check sentry" (or anything similar — "look at sentry", "fix sentry errors", "any new bugs?"), do this:

1. **Fetch unresolved issues**:
   ```bash
   npm run sentry:check
   ```
   Output is human-readable with stack frames and Sentry permalinks.

2. **Skip these — report them, do NOT auto-fix**:
   - Errors in `src/app/api/stripe/**`, `src/app/api/admin/**`, `src/lib/stripe.ts`
   - Errors in `src/lib/supabase/server.ts`, RLS migrations, auth callbacks
   - Anything touching `users.user_type`, `is_verified`, `is_suspended`, money columns
   - Errors with `level: fatal`
   - Errors seen by >10 distinct users (deserve human eyes)
   - Errors with unclear root cause from the stack trace alone

3. **For fixable issues**:
   - Read the top in-app frame, open that file at the offending line
   - Diagnose root cause (null deref, missing check, wrong type, etc.)
   - Write a minimal, focused fix — never refactor adjacent code
   - Run `npx tsc --noEmit` to verify the fix typechecks
   - Open a PR (NEVER push to main directly):
     ```bash
     git checkout -b fix/sentry-<short_id>
     git add <only the changed files>
     git commit -m "Fix: <one-line summary>"
     git push -u origin fix/sentry-<short_id>
     gh pr create --title "Fix: <summary>" --body "$(cat <<'EOF'
     ## Sentry issue
     <permalink>

     ## Root cause
     <one paragraph>

     ## Fix
     <one paragraph + before/after if useful>

     ## Test plan
     - [ ] Verify fix locally
     - [ ] Confirm Sentry issue stops reproducing after merge
     EOF
     )"
     ```
   - DO NOT mark the Sentry issue resolved — the user does that after merging.

4. **Per-session safety limits**:
   - Max **3 PRs** per "check sentry" run. List the rest, stop at 3.
   - If a fix needs >50 lines of new code, stop and report — too risky to auto-PR.
   - Never delete error-handling code. Fix the underlying bug instead.

5. **If unsure**, list the issue in your reply WITHOUT opening a PR. Under-fixing is safer than auto-merging nonsense.
<!-- END:sentry-auto-fix -->

<!-- BEGIN:parked-features -->
# Parked features — designs ready, not yet built

When the user says "let's build monthly payments" / "recurring rent" / "Option C", or asks how to charge subsequent months: read **`docs/recurring-rent-design.md`** first. It has the full architecture (migration 013, save-card-at-checkout, nightly cron, retry policy, cancellation flow, edge cases, ~31h effort estimate) so you don't redesign it from scratch.

The decision to defer until after 5 beta users validate the basic flow was deliberate — don't ship recurring before validation unless the user explicitly overrides.
<!-- END:parked-features -->
