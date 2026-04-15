# RRAASI Mobile App Export Document

This document provides all the necessary technical and design details for a mobile developer to replicate the RRAASI experience on iOS/Android while connecting to the existing cloud infrastructure.

## 🎨 Design System

### Color Palette (Brand Spiritual Theme)

#### Light Theme
- **Background**: `#fff7e6` (Soft Saffron Cream)
- **Foreground**: `#2c1a0c` (Deep Brown)
- **Primary**: `#ff7a00` (Vibrant Orange)
- **Secondary**: `#ffe8cc` (Warm Peach)
- **Muted**: `#f7e8d5` (Sand)
- **Accent**: `#ffe0b3` (Soft Amber)
- **Destructive**: `#b3261e`

#### Dark Theme
- **Background**: `#1a1208` (Deep Ritual Brown)
- **Foreground**: `#ffe8cc` (Warm Cream)
- **Primary**: `#ff9f4d` (Sunrise Orange)
- **Secondary**: `#2a1f12` (Shadow Brown)
- **Accent**: `#3a2916`

### Typography
- **Sans-Serif**: Public Sans / Inter (Clean, modern)
- **Serif/Spiritual**: Cinzel (For headings/mantras)
- **Monospace**: Commit Mono (For technical data)

### Visual Effects
- **Gradients**: `linear-gradient(135deg, #ff7a00 0%, #ffe0b3 100%)`
- **Animations**: Use smooth, floating transitions. High-quality micro-animations (e.g., Lottie or Framer Motion equivalents).

---

## 🖼️ Brand Assets

Found in the `public/branding` directory:
- **Main Logo**: `logo.png`
- **Round Icon**: `logo-round.png`
- **Horizontal Logo**: `logo-horizontal.png`
- **App Icons**: `mobile-app-icon.png`, `apple-icon.png`

---

## 🔗 Backend & API Integration

The mobile app should connect to the existing production backend services.

### Base URLs
- **Auth & Core Server**: `https://satsang-auth-server-6ougd45dya-el.a.run.app`
- **Marketing Server**: `https://rraasi.com/api/marketing` (Proxied)

### Authentication Flow
1. **Phone Login**: Use the Firebase Auth SDK (Native) or hit the `/api/auth` endpoints.
2. **Session Persistence**: Use JWT/Cookie based sessions provided by the Auth Server.

### Key API Endpoints
- **User Profile**: `GET /api/user/profile`
- **User List**: `GET /api/user/list`
- **Marketing/Broadcasts**: `/api/auth-marketing/whatsapp/*`

### 📚 Static Data
- **Guru Directory**: `gurus_export.json` (Names, tags, and biographies for all spiritual masters).
- **Asset Manifest**: `assets_manifest.json` (Public GCS URLs for all logos, icons, and portraits).

---

## 🛠️ Recommended Tech Stack
- **Framework**: React Native (with Expo) or Flutter.
- **Icons**: Lucide Icons (matching the web app).
- **Styling**: Tailwind CSS (NativeWind) or Styled Components using the tokens above.
- **State Management**: TanStack Query (React Query) for robust API fetching.

---

## 📑 Developer Instructions
1. **Replicate the "Spiritual Glow"**: Use subtle shadows and radial gradients to create the "Aura" effect seen in the web player.
2. **Offline Support**: Ensure spiritual music/mantras can be cached for offline listening.
3. **Safe Areas**: Implement proper padding for iOS notches and Android status bars (already defined in `globals.css` utilities).
