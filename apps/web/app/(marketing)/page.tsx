import { Badge } from '@/components/badge';
import { ToolGrid } from '@/components/tool-grid';
import { TOOLS } from '@/lib/tools.manifest';

export default function MarketingHomePage() {
  return (
    <div className="space-y-16">
      <section className="space-y-6 text-center sm:space-y-8">
        <Badge className="mx-auto" variant="outline">
          Work-in-progress lab
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
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
