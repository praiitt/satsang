'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/livekit/button';
import { useLanguage } from '@/contexts/language-context';
import { type CustomGuruIntentData, saveCustomGuruInterest } from '@/lib/custom-guru-intent';
import { cn } from '@/lib/utils';

const STYLE_TAG_OPTIONS = [
  { id: 'traditional', key: 'traditional' },
  { id: 'modern', key: 'modern' },
  { id: 'nonReligious', key: 'nonReligious' },
  { id: 'mystical', key: 'mystical' },
  { id: 'psychology', key: 'psychology' },
] as const;

export function CustomGuruInterestForm() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const returnUrl = pathname || '/';
  const [idealGuruDescription, setIdealGuruDescription] = useState('');
  const [currentNeeds, setCurrentNeeds] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [canContact, setCanContact] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!idealGuruDescription.trim()) {
      setError('Please describe your ideal guru');
      return;
    }

    if (contactEmail && !validateEmail(contactEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (contactEmail && !canContact) {
      setError('Please check the consent box if you provide an email');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CustomGuruIntentData = {
        idealGuruDescription: idealGuruDescription.trim(),
        currentNeeds: currentNeeds.trim() || undefined,
        styleTags: selectedTags.length > 0 ? selectedTags : undefined,
        contactEmail: contactEmail.trim() || undefined,
        canContact: canContact,
        language,
        userId: user?.uid || null,
      };

      await saveCustomGuruInterest(data);
      setIsSubmitted(true);
      // Reset form
      setIdealGuruDescription('');
      setCurrentNeeds('');
      setSelectedTags([]);
      setContactEmail('');
      setCanContact(false);
    } catch (err) {
      console.error('Error submitting custom guru interest:', err);
      setError(err instanceof Error ? err.message : t('customGuru.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <section className="mx-auto mt-12 max-w-3xl px-4 sm:mt-16">
        <div className="bg-background border-input rounded-2xl border p-8 text-center shadow-sm">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </section>
    );
  }

  // Show login required message if not authenticated
  if (!isAuthenticated) {
    return (
      <section className="mx-auto mt-12 max-w-3xl px-4 sm:mt-16">
        <div className="bg-background border-input rounded-2xl border p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <span className="bg-primary/10 text-primary mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
              Beta
            </span>
            <h2 className="text-foreground mt-3 text-2xl font-bold sm:text-3xl">
              {t('customGuru.title')}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6 sm:text-base">
              {t('customGuru.subtitle')}
            </p>
          </div>
          <div className="bg-muted/50 border-input rounded-xl border p-6 text-center">
            <div className="mb-4 text-3xl">🔒</div>
            <h3 className="text-foreground mb-2 text-xl font-semibold">
              {t('customGuru.loginRequired')}
            </h3>
            <p className="text-muted-foreground mb-6 text-sm leading-6">
              {t('customGuru.loginRequiredMessage')}
            </p>
            <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}>
              <Button variant="primary" size="lg">
                {t('customGuru.loginButton')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (isSubmitted) {
    return (
      <section className="mx-auto mt-12 max-w-3xl px-4 sm:mt-16">
        <div className="bg-background border-primary/20 rounded-2xl border p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl">✨</div>
          <h3 className="text-foreground mb-3 text-2xl font-bold">
            {t('customGuru.successTitle')}
          </h3>
          <p className="text-muted-foreground text-base leading-7">
            {t('customGuru.successMessage')}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-12 max-w-3xl px-4 sm:mt-16">
      <div className="bg-background border-input rounded-2xl border p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <span className="bg-primary/10 text-primary mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
            Beta
          </span>
          <h2 className="text-foreground mt-3 text-2xl font-bold sm:text-3xl">
            {t('customGuru.title')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6 sm:text-base">
            {t('customGuru.subtitle')}
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {t('customGuru.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ideal Guru Description */}
          <div>
            <label htmlFor="idealGuru" className="text-foreground mb-2 block text-sm font-semibold">
              {t('customGuru.idealGuruLabel')} <span className="text-destructive">*</span>
            </label>
            <textarea
              id="idealGuru"
              value={idealGuruDescription}
              onChange={(e) => setIdealGuruDescription(e.target.value)}
              placeholder={t('customGuru.idealGuruPlaceholder')}
              required
              rows={5}
              className={cn(
                'bg-background border-input text-foreground placeholder:text-muted-foreground',
                'w-full rounded-lg border px-4 py-3 text-sm',
                'focus:border-primary focus:ring-primary/20 focus:ring-2 focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'min-h-[120px] resize-y'
              )}
            />
          </div>

          {/* Current Needs */}
          <div>
            <label
              htmlFor="currentNeeds"
              className="text-foreground mb-2 block text-sm font-semibold"
            >
              {t('customGuru.currentNeedsLabel')}
            </label>
            <input
              type="text"
              id="currentNeeds"
              value={currentNeeds}
              onChange={(e) => setCurrentNeeds(e.target.value)}
              placeholder={t('customGuru.currentNeedsPlaceholder')}
              className={cn(
                'bg-background border-input text-foreground placeholder:text-muted-foreground',
                'w-full rounded-lg border px-4 py-3 text-sm',
                'focus:border-primary focus:ring-primary/20 focus:ring-2 focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
          </div>

          {/* Style Tags */}
          <div>
            <label className="text-foreground mb-3 block text-sm font-semibold">
              {t('customGuru.styleTagsLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    selectedTags.includes(tag.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-accent'
                  )}
                >
                  {t(`customGuru.styleTags.${tag.key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Email */}
          <div>
            <label
              htmlFor="contactEmail"
              className="text-foreground mb-2 block text-sm font-semibold"
            >
              {t('customGuru.contactEmailLabel')}
            </label>
            <input
              type="email"
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder={t('customGuru.contactEmailPlaceholder')}
              className={cn(
                'bg-background border-input text-foreground placeholder:text-muted-foreground',
                'w-full rounded-lg border px-4 py-3 text-sm',
                'focus:border-primary focus:ring-primary/20 focus:ring-2 focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
            <p className="text-muted-foreground mt-1 text-xs">{t('customGuru.contactEmailHint')}</p>
          </div>

          {/* Consent Checkbox */}
          {contactEmail && (
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="canContact"
                checked={canContact}
                onChange={(e) => setCanContact(e.target.checked)}
                className="border-input text-primary focus:ring-primary mt-1 h-4 w-4 rounded"
              />
              <label htmlFor="canContact" className="text-foreground text-sm leading-6">
                {t('customGuru.canContactLabel')}
              </label>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t('customGuru.submitting') : t('customGuru.submitButton')}
          </Button>
        </form>
      </div>
    </section>
  );
}
