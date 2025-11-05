'use client';

import { useState } from 'react';

interface LiveSatsangJoinFormProps {
  onJoin: (name: string, role: 'host' | 'participant') => void;
}

export function LiveSatsangJoinForm({ onJoin }: LiveSatsangJoinFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'host' | 'participant'>('participant');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsJoining(true);
    try {
      await onJoin(name.trim(), role);
    } catch (error) {
      console.error('Error joining:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl sm:p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-primary/10 p-4">
            <span className="text-4xl">🕉️</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            लाइव सत्संग
          </h1>
          <p className="text-base font-medium text-foreground/90 sm:text-lg">
            आध्यात्मिक संगति में शामिल हों
          </p>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            गुरुजी और अन्य साधकों से जुड़ें
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-base font-semibold text-foreground sm:text-lg"
            >
              आपका नाम
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="अपना नाम लिखें"
              className="w-full rounded-xl border-2 border-input bg-input/50 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:bg-input focus:ring-4 focus:ring-primary/20 focus:outline-none sm:px-6 sm:py-5 sm:text-lg"
              disabled={isJoining}
              required
              autoComplete="name"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label
              htmlFor="role"
              className="mb-2 block text-base font-semibold text-foreground sm:text-lg"
            >
              भूमिका
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'host' | 'participant')}
              className="w-full rounded-xl border-2 border-input bg-input/50 px-5 py-4 text-base text-foreground transition-all focus:border-primary focus:bg-input focus:ring-4 focus:ring-primary/20 focus:outline-none sm:px-6 sm:py-5 sm:text-lg"
              disabled={isJoining}
            >
              <option value="participant" className="bg-card text-foreground">
                प्रतिभागी
              </option>
              <option value="host" className="bg-card text-foreground">
                होस्ट (प्रबंधक)
              </option>
            </select>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {role === 'host' ? (
                <span className="flex items-center gap-2">
                  <span>👑</span>
                  <span>होस्ट सभी को म्यूट कर सकते हैं और कक्ष नियंत्रित कर सकते हैं</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>🙏</span>
                  <span>प्रतिभागी बोल सकते हैं और संवाद कर सकते हैं</span>
                </span>
              )}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isJoining || !name.trim()}
            className="w-full rounded-xl bg-primary px-6 py-5 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:px-8 sm:py-6 sm:text-lg"
          >
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"></span>
                जुड़ रहा है...
              </span>
            ) : (
              'लाइव सत्संग में शामिल हों 🌿'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground sm:text-base">
            आध्यात्मिक उन्नति के लिए पवित्र स्थान
          </p>
        </div>
      </div>
    </div>
  );
}
