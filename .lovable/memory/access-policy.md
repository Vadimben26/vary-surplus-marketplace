---
name: Access Policy
description: Welcome screen with role choice; buyer can be guest, seller must register; questionnaire deferred for buyers
type: feature
---
**Root `/`** shows a Welcome screen (`/pages/Welcome.tsx`) with two options:
- **Acheteur** → goes to `/bienvenue/acheteur` (sub-choice: create profile OR continue as guest)
- **Vendeur** → goes directly to `/inscription/vendeur` (NO guest option, must register)

Logged-in users skip the welcome screen — redirected to `/seller` (if seller) or `/marketplace`.

**Public**: marketplace, lot detail, contact/FAQ, legal pages, registration, login.

**Auth required**: cart, checkout, orders, messages, favorites, profile, seller dashboard.

**Buyer questionnaire (`/inscription/acheteur`) is triggered ONLY when:**
1. User chose "Create profile" on welcome flow.
2. Logged-in buyer attempts checkout (first payment) → modal `BuyerPrefsGate` blocks pay button.
3. Logged-in buyer attempts add-to-cart or contact-seller on a lot whose seller has `visibility_mode = 'filtered'` → modal `BuyerPrefsGate` blocks the action.

`useBuyerPrefs()` checks `buyer_preferences` for the current user. The gate redirects to `/inscription/acheteur?return=<path>` and the registration's success screen honors `?return=` to bring the user back.
