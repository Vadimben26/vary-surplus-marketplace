---
name: Onboarding Flows
description: Buyer auto-approved instantly with matching algorithm; seller requires manual approval by Vary team within 48h
type: feature
---
**Buyer onboarding (`/inscription/acheteur`)**: 2-step questionnaire. **Auto-approved instantly** — no manual validation. Step 2 (categories, delivery countries, budget, annual revenue) feeds the **matching algorithm** (`src/lib/buyerMatching.ts`) that scores and personalizes the marketplace order via `useBuyerMatching` hook.

**Seller onboarding (`/inscription/vendeur`)**: 3-step form. **Requires manual approval by the Vary team** (`seller_preferences.approval_status` = `pending` | `approved` | `rejected`, default `pending`). Until approved:
- New lots are forced to `status='draft'` (RLS policy `is_seller_approved()` blocks `status='active'` inserts/updates).
- `SellerApprovalBanner` shown at top of dashboard explains the pending/rejected state.
- Approved sellers can publish lots normally.

**Matching score weights**: category 40 / delivery country 25 / budget 20 / revenue tier 10 / recency 5.
