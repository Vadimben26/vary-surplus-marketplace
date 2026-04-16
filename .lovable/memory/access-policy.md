---
name: Access Policy
description: Public marketplace, buyer questionnaire deferred to checkout/filtered lots, root redirects to marketplace
type: feature
---
**Root `/` redirects to `/marketplace`** (no entry wall).

**Public**: marketplace, lot detail, contact/FAQ, legal pages, registration, login.

**Auth required**: cart, checkout, orders, messages, favorites, profile, seller dashboard.

**Buyer questionnaire (`/inscription/acheteur`) is triggered ONLY when:**
1. Logged-in buyer attempts checkout (first payment) → modal `BuyerPrefsGate` blocks pay button.
2. Logged-in buyer attempts add-to-cart or contact-seller on a lot whose seller has `visibility_mode = 'filtered'` → modal `BuyerPrefsGate` blocks the action.

`useBuyerPrefs()` checks `buyer_preferences` for the current user. The gate redirects to `/inscription/acheteur?return=<path>` and the registration's success screen honors `?return=` to bring the user back.
