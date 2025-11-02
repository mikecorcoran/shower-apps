import { ToolGrid } from '@/components/tool-grid';
import { TOOLS } from '@/lib/tools.manifest';

export default function MarketingHomePage() {
  return (
    <div className="space-y-14">
      <section className="space-y-6 text-center">
        <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-wide text-muted">
          Work-in-progress lab
        </span>
        <h1 className="text-balance text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Shower thoughts turned into useful, mobile-first tools.
        </h1>
        <p className="mx-auto max-w-2xl text-balance text-base text-muted sm:text-lg">
          Explore small utilities designed for quick wins. Everything runs in your browser—no sign-ups, no data leaving your
          device.
        </p>
      </section>
      <ToolGrid tools={TOOLS} />
    </div>
  );
}
