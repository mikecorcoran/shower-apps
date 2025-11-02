import dynamic from 'next/dynamic';
import type { ComponentType, SVGProps } from 'react';

const iconImports: Record<string, () => Promise<{ default: ComponentType<SVGProps<SVGSVGElement>> }>> = {
  'archive-explorer': () => import('@/icons/archive-explorer')
};

export function getToolIcon(slug: string) {
  const loader = iconImports[slug];
  if (!loader) {
    return dynamic(() => import('@/icons/logo'), { ssr: false });
  }
  return dynamic(loader, {
    ssr: false
  });
}
