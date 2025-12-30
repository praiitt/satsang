import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="bg-background/95 border-border mt-8 w-full border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} RRAASI.ai. सर्वाधिकार सुरक्षित।
          </p>
          <nav className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/#faq" className="text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
            <Link href="/ui" className="text-muted-foreground hover:text-foreground">
              UI
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
