"use client";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
          <span className="text-3xl">🛠️</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Under Maintenance</h1>
        <p className="text-white/80 leading-relaxed">
          We’re making some improvements to your Satsang experience. Please check back soon.
        </p>
        <p className="text-white/60 text-sm">Thank you for your patience and blessings.</p>
      </div>
    </div>
  );
}


