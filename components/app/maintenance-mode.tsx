'use client';

export function MaintenanceMode() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white">
      <div className="w-full max-w-xl space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
          <span className="text-3xl">🛠️</span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Under Maintenance</h1>
        <p className="leading-relaxed text-white/80">
          हम आपके सत्संग अनुभव को बेहतर बना रहे हैं। कृपया थोड़ी देर बाद पुनः देखें।
        </p>
        <p className="text-sm text-white/60">Thank you for your patience and blessings.</p>
      </div>
    </div>
  );
}
