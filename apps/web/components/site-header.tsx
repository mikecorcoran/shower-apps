import Link from 'next/link';
import { TOOLS } from '@/lib/tools.manifest';
import Logo from '@/icons/logo';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
          <Logo className="h-7 w-7" />
          Shower Apps
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {TOOLS.map((tool) => (
            <Link key={tool.slug} href={`/tools/${tool.slug}`} className="text-muted hover:text-foreground">
              {tool.title}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
