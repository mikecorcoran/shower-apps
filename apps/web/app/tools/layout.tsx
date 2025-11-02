import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tools'
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <div className="space-y-12 sm:space-y-14">{children}</div>;
}
