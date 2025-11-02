import Link from 'next/link';
import { TOOLS } from '@/lib/tools.manifest';
import Logo from '@/icons/logo';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[70rem] items-center justify-between px-5 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-base font-semibold tracking-tight text-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40"
        >
          <Logo className="h-7 w-7" />
          Shower Apps
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-muted md:flex">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="rounded-full px-3 py-1 transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40"
            >
              {tool.title}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
