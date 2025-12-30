# 🔧 Translation Fix for Homepage

## Issue
The homepage is showing translation keys (like `rraasHome.title`) instead of actual translated text.

## Root Cause
**Hydration Mismatch**: The server-side render doesn't have access to localStorage (where language preference is stored), so it renders with default values. When the client hydrates, it tries to load from localStorage, causing a mismatch.

## Solution

Add a mounted state check to prevent rendering until client-side hydration is complete.

### File to Update
`components/app/rraasi-home-welcome-view.tsx`

### Changes Needed

**At the top** (after line 119), add:

```typescript
export const RRaaSiHomeWelcomeView = ({ ref }: React.ComponentProps<'div'>) => {
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch - don't render until client-side
    if (!mounted) {
        return (
            <div className="relative w-full min-h-screen flex items-center justify-center">
                <div className="text-2xl">Loading...</div>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative w-full overflow-hidden">
            <SacredGeometryBg />
            {/* rest of component... */}
```

## Alternative Solution (Better)

Update `contexts/language-context.tsx` to use a default language on server-side:

```typescript
export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to 'hi' on server, load from localStorage on client
  const [language, setLanguageState] = useState<Language>('hi');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'hi')) {
      setLanguageState(saved);
    }
  }, []);

  // ... rest of code
}
```

This ensures consistent rendering on server and client.

## Quick Fix Command

```bash
# Restart the dev server
cd /Users/prakash/Documents/satsang/satsangapp
# Kill and restart
npm run dev
```

The issue should resolve after the client-side JavaScript loads.

---

**Status**: Needs manual fix  
**Priority**: Medium  
**Affects**: Homepage, Tarot landing page, any page using translations
