## Multi-Guru Dynamic Landing Page Plan

### 1. UX & Content Direction (RRAASI Vision)
- **Goal**: Make the home experience clearly about “one place for all spiritual belief systems,” where:
  - A short hero clearly explains the vision: *“Find your guru. Any tradition. Or create your own.”*
  - Users immediately see multiple guru options (Guruji, ET Agent, Osho, future gurus).
  - There is a clear **“Create your own spiritual guru”** entrypoint.
- **Key Sections**:
  - **Hero**: Vision statement, subtext about many belief systems, primary CTA: “Find your guru now”, secondary CTA: “Create your guru”.
  - **Guru Directory**: Responsive grid/cards of all available gurus (with filters by tradition/tags).
  - **How it Works**: 3–4 steps that explain: choose guru → start satsang → optionally create your guru.
  - **Why RRAASI**: Brief bullets on “All traditions in one place”, “Voice-first satsang”, “Hindi & English”, etc.

### 2. Data Model for Gurus (Config-Driven)
- **New file**: `lib/gurus.ts`
  - **Type**:
    - `id`: string (e.g. `"guruji"`, `"et"`, `"osho"`)
    - `route`: string (existing routes like `"/"`, `"/et-agent"`, `"/osho"`, future ones such as `"/krishna"`)
    - `name`: string (display name, e.g. `"Guruji"`, `"ET Agent"`, `"Osho"`)
    - `tradition`: string (e.g. `"Sanatana Dharma"`, `"ET / Cosmic"`, `"Neo-Zen"`)
    - `shortTagline`: string (1-line description used on card)
    - `descriptionKey`: translation key for full description (e.g. `"gurus.guruji.description"`)
    - `primaryColor` / `accentClass`: for card/chip styling (Tailwind classes)
    - `icon`: string (emoji or simple identifier)
    - `tags`: string[] (e.g. `["bhakti", "vedic"]`, used for filters/search)
    - `isFeatured`: boolean (to highlight some gurus at top)
  - **Export**:
    - `export const GURUS: GuruDefinition[] = [...]`
    - This becomes the **single source of truth** for:
      - Landing page guru cards.
      - Potential future guru selector menus / headers.

### 3. Landing Page UI Components
- **3.1 New `GuruDirectory` view**
  - **File**: `components/app/guru-directory-view.tsx`
  - **Responsibilities**:
    - Import `GURUS` from `lib/gurus.ts`.
    - Render:
      - **Hero section** (replacing or complementing current `WelcomeView` hero):
        - Uses `useLanguage()` and new translation keys (`home.title`, `home.subtitle`, `home.vision`).
        - Two primary buttons:
          - “Find your guru now” → scroll to guru grid.
          - “Create your own guru” → navigates to creation/learn page.
      - **Filters**:
        - Simple pill filters (e.g. “All”, “Bhakti”, “Zen”, “ET / Cosmic”).
        - Filter by `tags` or `tradition`.
      - **Guru grid**:
        - Map over `GURUS` and render `GuruCard` for each.
        - Responsive: 1 column on mobile, 2–3 columns on tablet/desktop.
      - **Create Your Guru CTA**:
        - A highlight card at end of grid: “Didn’t find your guru? Create your own”.
        - Button: “Create Your Guru” → route like `/create-guru` (planned page) or docs for now.

- **3.2 `GuruCard` component**
  - **File**: `components/app/guru-card.tsx`
  - **Props**: `guru: GuruDefinition`
  - **Layout**:
    - Icon/avatar circle.
    - Guru name + tradition.
    - Short tagline from translations (e.g. `t('gurus.guruji.tagline')`).
    - Tags as small pills.
    - CTA button: “Talk to {name}” → `router.push(guru.route)`.
  - **Behavior**:
    - Entire card clickable as well as CTA button.
    - Respect app theme (light/dark).

- **3.3 Integrate into existing `WelcomeView`/`ViewController`**
  - Option A (recommended): **Replace current `WelcomeView` content** with new multi-guru layout:
    - Keep hero video (`HeroVideoPlayer`) but change copy to multi-guru vision.
    - After hero, insert the `GuruDirectory` section instead of current single-guru features grid.
  - Option B: **Split into separate `MultiGuruLanding` component**:
    - `ViewController` uses `MultiGuruLanding` instead of existing `WelcomeView`.
  - Ensure the **start button behavior** is still valid:
    - For home page, primary interaction should be clicking a guru card (route navigation), not directly starting a session in the base room.

### 4. Routing & Navigation
- **Existing guru routes**:
  - `"/"` → main Guruji experience (via `App` & `ViewController`).
  - `"/et-agent"` → ET agent.
  - `"/osho"` → Osho agent.
- **Change in behavior**:
  - Home landing (`/(app)/page.tsx` + `App`) becomes the **multi-guru hub**, not a single-guru “start satsang” page.
  - Each guru card navigates to its dedicated route.
- **Future-proofing**:
  - When adding new guru agents:
    - Create new agent (using your generator script).
    - Add route.
    - Add entry in `GURUS` config.
    - Landing auto-updates to show the new guru.

### 5. “Create Your Own Spiritual Guru” Flow (v1)
- **Short-term (static guidance)**:
  - Add a route `/create-guru` (Next.js page).
  - Describe in Hindi/English:
    - Vision: “Here you can design your own guru’s personality.”
    - Explain that currently custom guru creation is done via support / config / script.
    - Provide simple steps (e.g., fill configuration JSON + contact support), or link to internal docs.
- **Medium-term (wizard UI)**:
  - Create a multi-step form:
    - Step 1: Choose tradition / theme (Bhakti, Zen, Advaita, ET, etc.).
    - Step 2: Define core teachings & tone (instructions).
    - Step 3: Choose name, avatar/icon, language preference.
    - Step 4: Confirm → show generated config JSON and instructions to deploy (using generator script).
  - This UI can eventually call a backend API that invokes your `generate-agent.py` logic server-side.

### 6. Translations & Content
- **New translation keys** in `lib/translations.ts`:
  - Under `en.home` (or `en.welcome` if you re-use the namespace):
    - `title`: “Find your guru. Many paths, one home.”
    - `subtitle`: “RRAASI brings all spiritual belief systems into one place – voice satsang with your favourite guru, or create your own.”
    - `vision`: Short paragraph about unifying traditions & personalized gurus.
    - `discoverGurus`: “Browse Gurus”
    - `createGuru`: “Create Your Guru”
    - Filter labels: `filterAll`, `filterBhakti`, `filterZen`, `filterET`, etc.
  - Under `en.gurus.{id}` for each guru:
    - `name`, `tagline`, `description`.
  - Mirror under `hi.home` and `hi.gurus.{id}` with good Hindi copy.
- **Update existing “welcome” strings**:
  - Align the old single-guru text with new vision:
    - Emphasize “choose your guru or start with Guruji”.

### 7. Implementation Steps (Technical)
- **Step 1: Guru config**
  - Create `lib/gurus.ts` with `GuruDefinition` type and `GURUS` array (initial entries: Guruji, ET Agent, Osho).
- **Step 2: Translations**
  - Add `home` + `gurus` translation keys (en & hi) describing:
    - Overall vision.
    - Per-guru tagline/description.
- **Step 3: GuruCard & GuruDirectory components**
  - Implement `GuruCard` and `GuruDirectoryView` as described.
  - Ensure they are responsive and use `useLanguage()` for text.
- **Step 4: Integrate into landing**
  - Modify `WelcomeView` (or add `MultiGuruLanding`) to:
    - Use new `home.*` text.
    - Render `GuruDirectoryView` below the hero/video.
  - Keep existing video section but update heading copy to match vision.
- **Step 5: Create-your-guru page (v1)**
  - Add `app/(app)/create-guru/page.tsx` with explanatory content and link to docs / support.
- **Step 6: QA**
  - Test in both English/Hindi:
    - Landing content language switches correctly.
    - Guru cards navigate to the right routes.
    - Existing routes (`/et-agent`, `/osho`, main Guruji flow) still work as before.

### 8. Future Enhancements
- **Personalization**:
  - Remember recently used or “favourite” guru in localStorage; highlight that card first.
- **Search bar**:
  - Allow searching gurus by topic (“meditation”, “ET”, “bhakti”).
- **Badges & status**:
  - Mark new or beta gurus (e.g., “NEW”, “BETA” badge on cards).
- **Analytics**:
  - Track which gurus users pick most to inform future agents.


