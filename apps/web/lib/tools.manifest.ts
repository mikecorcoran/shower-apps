export const TOOL_SLUGS = ['archive-explorer'] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

export type ToolEntry = {
  slug: ToolSlug;
  title: string;
  description: string;
  icon: string;
  tags?: string[];
  dateAdded: string;
  status?: 'alpha' | 'beta' | 'stable' | 'deprecated';
};

export const TOOLS: ToolEntry[] = [
  {
    slug: 'archive-explorer',
    title: 'Archive Explorer',
    description: 'Unpack archives in the browser, browse files, and download selections.',
    icon: 'archive-explorer',
    tags: ['files', 'compression'],
    dateAdded: '2024-07-14',
    status: 'beta'
  }
];
