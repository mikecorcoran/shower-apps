import { buildArchiveTree, formatBytes } from '@/lib/archive';

describe('archive utilities', () => {
  it('builds a nested tree from flat entries', () => {
    const tree = buildArchiveTree([
      { path: 'folder/file.txt', name: 'file.txt', isDirectory: false, size: 32 },
      { path: 'folder/sub/image.png', name: 'image.png', isDirectory: false, size: 64 }
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('folder');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children.map((child) => child.name)).toEqual(expect.arrayContaining(['file.txt', 'sub']));
  });

  it('formats bytes nicely', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
  });
});
