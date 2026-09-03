# AIDA Widget — Pre-Launch Task List

Prioritized by dependency order and risk. Tasks marked with the repo they live in.

---

## P0 — Ship Blockers (Week 1-2)

### 1. Remove hardcoded API key from frontend bundle
`src/AidaWidget/utils/apiConfig.js` ships `CREDITS_API_KEY` in plain text. Anyone can read arbitrary users' credit balances. Move to backend proxy or environment variable injected at build time. **Repo: aida-widget**

> **Impact:** Anyone can view the source code and use our API key to look up any user's credit balance, which is a privacy and security liability.

### 2. Stripe live mode activation + webhook wiring
Currently test mode only. Need live keys, webhook handler for `checkout.session.completed` and `invoice.paid` events to credit accounts automatically. Payment link in `ChatHeader.jsx` is a raw `<a href>` with no callback handling. **Repo: aitutfunc backend**

> **Impact:** Users can't actually pay us real money right now, so there's no revenue.

### 3. Bind payment identity to chat identity
Right now `useChatAPI.js` sends `user.email` and `user.id` but there's no verification — a user can pass any userId to the credits API. Need server-side auth: validate the user making the request owns the balance they're querying/spending. **Repo: aitutfunc backend**

> **Impact:** There's nothing stopping someone from spending another user's credits by spoofing their user ID.

### 4. Negative balance guard
Nothing stops usage when credits hit zero. Backend must reject requests when `balance <= 0` and frontend should show a clear "add credits" CTA instead of streaming. Currently `CreditsDisplay.jsx` does optimistic deduction but the backend doesn't enforce it. **Repo: aitutfunc backend + aida-widget**

> **Impact:** Users can keep chatting after their credits hit zero because nothing blocks them, meaning we give away free usage indefinitely.

### 5. Define pricing and apply markup
Meeting identified 10% markup on provider costs. No markup logic exists anywhere — raw cost is passed through from OpenRouter. Decide final margin, implement in backend billing, and surface final price (not provider cost) to the user. **Repo: aitutfunc backend**

> **Impact:** We're passing through the raw provider cost to users with zero margin, so every message a user sends costs us money.

---

## P1 — Core Product (Week 2-4)

### 6. Cost preview on model hover
Mayank described showing estimated cost before the user sends a message. Need per-model pricing data (already partially in the `/models` endpoint response) displayed in the model selector. Users currently pick models blind to cost. **Repo: aida-widget**

> **Impact:** People pick models blindly and get surprised by the cost after the message, which erodes trust and discourages usage.

### 7. Multi-provider price comparison view
Show the same model available from multiple providers with different prices (e.g., DeepSeek via OpenRouter vs direct). Requires backend to query multiple endpoints or maintain a pricing table. This is the core "comparison shopping" value prop. **Repo: aitutfunc backend + aida-widget**

> **Impact:** The core value prop is "compare AI prices like flight tickets" but we only show one provider's price, not alternatives.

### 8. Auto-router modes (cheapest / wisest / sovereign)
Three routing strategies discussed in the meeting: cheapest available, best-quality for the task, and India-hosted-only. Needs a routing layer in the backend that selects provider based on mode. No code exists for this yet. **Repo: aitutfunc backend**

> **Impact:** Users have to manually pick from 30+ models instead of just saying "give me the cheapest" or "give me the best," which is overwhelming.

### 9. Usage dashboard / spending history
Users need to see what they spent and on what. Currently only a live balance in `CreditsDisplay.jsx` with animated deductions. Need a history view — per-message cost is already tracked in the stream response. **Repo: aitutfunc backend + aida-widget**

> **Impact:** Users see a live balance but can't review what they spent on, making it hard to trust the billing or manage their budget.

### 10. Model catalog cleanup
`DEFAULT_MODELS` in `AidaWidget.jsx` is a hardcoded fallback array with 30+ models. Some are outdated. The `/models` endpoint should be the single source of truth with the fallback trimmed to 5-6 reliable models. **Repo: aida-widget**

> **Impact:** The fallback list has outdated models that may fail or confuse users; the model catalog should come from the server, not a hardcoded array.

---

## P2 — Retention & Activation (Week 3-5)

### 11. First-run onboarding flow
95 signups, 2-4 WAU. Users land and don't know what to do. Need: a welcome state when chat history is empty, suggested first prompts, brief feature tour (voice, attachments, model switching, context limit). **Repo: aida-widget**

> **Impact:** New users land on an empty chat with no guidance, which is why only 2-4 out of 95 signups come back.

### 12. Feature discoverability
Voice input, URL scraping, folder upload, page context injection, web search toggle — these exist but are hidden behind small icons with no labels or tooltips. Add contextual hints or a feature menu. **Repo: aida-widget**

> **Impact:** Voice input, URL scraping, file upload, and web search exist but users don't find them because they're hidden behind unlabeled icons.

### 13. Shareable chat links
Mayank mentioned this as a retention lever — students share interesting AI conversations. Currently chats are IndexedDB-only (local, per-browser). Needs a backend endpoint to store and serve shared conversations. **Repo: aitutfunc backend + aida-widget**

> **Impact:** Students would share interesting AI chats with classmates (free growth loop), but chats are stuck in the browser's local storage.

### 14. Embed integration documentation
The widget exposes `render(selector, props)` and `pushContext()` in `main.jsx` but there's no documentation for host-page integrators. iVerse and any future embed partners need a setup guide. **Repo: aida-widget (docs)**

> **Impact:** Partners who want to embed the widget on their site have no guide, so integration requires hand-holding from the team.

---

## P3 — Polish & Scale (Week 5+)

### 15. Test infrastructure
Zero tests. `package.json` has no test framework. Add Vitest + React Testing Library. Priority targets: `useChatAPI.js` streaming paths, `creditsApi.js`, cost calculation logic. **Repo: aida-widget**

> **Impact:** Any code change could break streaming, billing, or the UI with no safety net, making it risky for anyone to ship quickly.

### 16. CORS lockdown
`staticwebapp.config.json` has `Access-Control-Allow-Origin: *`. Fine for development, needs to be restricted to actual embed domains (iverse.space, aitut.com) before launch. **Repo: aida-widget**

> **Impact:** Any website can make requests to our endpoints, not just our own app, which is a security risk in production.

### 17. Chrome Built-in AI and Ollama paths
These work (`useChromeAI.js`, `useOllama.js`) but are niche — Chrome AI is behind a flag, Ollama requires local setup. Decide if these ship at launch or stay hidden. They don't generate revenue (no billing on local inference). **Repo: aida-widget**

> **Impact:** Chrome Built-in AI and Ollama bypass our billing entirely, so users who discover them generate cost for us (support, maintenance) but no revenue.

### 18. Internationalization completion
`react-i18next` and `franc-min` (language detection) are installed but translations are incomplete. Decide target languages for Indian market (Hindi, Tamil, etc.) and complete string extraction. **Repo: aida-widget**

> **Impact:** The app has multilingual infrastructure but missing translations, so Indian-language users (the target market) hit English fallbacks or broken UI.

---

## What can't be done from this repo

Items 2, 3, 4, 5, 7, 8, 9, and 13 require the **aitutfunc Azure Functions backend** which isn't in this repository. Item 2 also requires access to the **Stripe dashboard** and the **iverse.space host page**. The widget repo can only handle the frontend half of these tasks.

---

## Suggested team split

- **Backend engineer**: Items 2-5, 7-9 (billing, auth, routing — all in aitutfunc)
- **Frontend engineer**: Items 1, 6, 10-12, 16 (widget code, onboarding, UI)
- **Both / product decision needed**: Items 5 (margin %), 8 (router logic), 13 (share infra), 17 (scope cut?)
