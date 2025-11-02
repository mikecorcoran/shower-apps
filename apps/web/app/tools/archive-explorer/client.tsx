'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { useDropzone } from 'react-dropzone';
import {
  ArchiveTreeNode,
  ArchiveFileEntry,
  buildArchiveTree,
  extractArchive,
  flattenFiles,
  formatBytes
} from '@/lib/archive';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = {
  'application/zip': ['.zip'],
  'application/gzip': ['.gz', '.tgz', '.tar.gz'],
  'application/x-tar': ['.tar'],
  'application/x-7z-compressed': ['.7z']
};

type ViewMode = 'tree' | 'gallery';

type TreeNodeState = {
  checked: boolean;
  indeterminate: boolean;
};

function computeDirectoryState(node: ArchiveTreeNode, selected: Set<string>): TreeNodeState {
  const filePaths = gatherFilePaths(node);
  if (!filePaths.length) {
    return { checked: false, indeterminate: false };
  }
  let selectedCount = 0;
  for (const path of filePaths) {
    if (selected.has(path)) selectedCount += 1;
  }
  if (selectedCount === 0) return { checked: false, indeterminate: false };
  if (selectedCount === filePaths.length) return { checked: true, indeterminate: false };
  return { checked: false, indeterminate: true };
}

function gatherFilePaths(node: ArchiveTreeNode): string[] {
  if (!node.children.length && node.entry && !node.isDirectory) {
    return [node.entry.path];
  }
  const results: string[] = [];
  node.children.forEach((child) => {
    if (!child.isDirectory && child.entry) {
      results.push(child.entry.path);
    }
    if (child.children.length) {
      results.push(...gatherFilePaths(child));
    }
  });
  return results;
}

function toBlobPart(view: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = view;
  if (buffer instanceof ArrayBuffer) {
    return buffer.slice(byteOffset, byteOffset + byteLength);
  }
  const copy = view.slice();
  return copy.buffer;
}

export default function ArchiveExplorerClient() {
  const [tree, setTree] = useState<ArchiveTreeNode[]>([]);
  const [files, setFiles] = useState<ArchiveFileEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openPaths, setOpenPaths] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>('tree');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState<string>('');

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    noClick: true,
    onDropAccepted: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      await handleFile(file);
    },
    onDropRejected: (rejections) => {
      const message = rejections[0]?.errors?.[0]?.message ?? 'Unsupported file';
      setError(message);
    }
  });

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);
    try {
      const entries = await extractArchive(file);
      const nextTree = buildArchiveTree(entries);
      setTree(nextTree);
      setFiles(flattenFiles(nextTree));
      const baseName = file.name.replace(/(\.tar\.gz|\.tgz|\.gz|\.zip|\.tar|\.7z)$/i, '');
      setArchiveName(baseName || file.name);
      setSelected(new Set());
      setView('tree');
      const allDirectories = new Set<string>();
      const collect = (nodes: ArchiveTreeNode[]) => {
        nodes.forEach((node) => {
          if (node.isDirectory) {
            allDirectories.add(node.path);
            if (node.children.length) collect(node.children);
          }
        });
      };
      collect(nextTree);
      setOpenPaths(allDirectories);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract archive';
      setError(message);
      setTree([]);
      setFiles([]);
      setSelected(new Set());
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const selectedFiles = useMemo(
    () => files.filter((entry) => selected.has(entry.path)),
    [files, selected]
  );
  const selectedSize = useMemo(
    () => selectedFiles.reduce((acc, file) => acc + (file.size ?? 0), 0),
    [selectedFiles]
  );

  const imageFiles = useMemo(
    () => files.filter((entry) => entry.mimeType?.startsWith('image/') && entry.data),
    [files]
  );

  const galleryPreviews = useMemo(() => {
    return imageFiles.map((entry) => {
      if (!entry.data) return { entry, url: undefined };
      const blob = new Blob([toBlobPart(entry.data)], { type: entry.mimeType ?? 'application/octet-stream' });
      return { entry, url: URL.createObjectURL(blob) };
    });
  }, [imageFiles]);

  useEffect(() => {
    return () => {
      galleryPreviews.forEach(({ url }) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [galleryPreviews]);

  const handleSelectFile = useCallback((path: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }, []);

  const handleSelectDirectory = useCallback((node: ArchiveTreeNode, checked: boolean) => {
    const filePaths = gatherFilePaths(node);
    setSelected((prev) => {
      const next = new Set(prev);
      filePaths.forEach((path) => {
        if (checked) {
          next.add(path);
        } else {
          next.delete(path);
        }
      });
      return next;
    });
  }, []);

  const handleDownloadSelection = useCallback(async () => {
    if (!selectedFiles.length) return;
    const zip = new JSZip();
    selectedFiles.forEach((entry) => {
      if (!entry.data) return;
      zip.file(entry.path, entry.data, { binary: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${archiveName || 'selection'}-selected.zip`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [selectedFiles, archiveName]);

  const handleDownloadSingle = useCallback((entry: ArchiveFileEntry) => {
    if (!entry.data) return;
    const blob = new Blob([toBlobPart(entry.data)], { type: entry.mimeType ?? 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = entry.name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const hasArchive = tree.length > 0;

  return (
    <div className="space-y-6">
      <section
        {...getRootProps({
          className: cn(
            'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-surface px-6 py-16 text-center shadow-sm transition hover:border-primary/60 hover:bg-primary/5',
            isDragActive && 'border-primary/80 bg-primary/10'
          )
        })}
      >
        <input {...getInputProps()} />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="text-2xl">📦</span>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">Drop or select an archive</p>
          <p className="text-sm text-muted">
            Zip, Tar, GZip, Tar.Gz, 7z — everything stays in the browser. Files never leave your device.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={open} disabled={isProcessing}>
          Browse files
        </Button>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {isProcessing && <p className="text-sm text-muted">Processing archive…</p>}
      </section>

      {hasArchive && (
        <section className="space-y-4 rounded-3xl border border-border/60 bg-surface p-6 shadow-sm">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted">Loaded archive</p>
              <h2 className="text-xl font-semibold text-foreground">{archiveName}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2 rounded-full bg-background p-1 text-sm shadow-inner">
                <button
                  type="button"
                  onClick={() => setView('tree')}
                  className={cn(
                    'rounded-full px-3 py-1 transition',
                    view === 'tree'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-accent hover:text-foreground'
                  )}
                >
                  Hierarchy
                </button>
                <button
                  type="button"
                  onClick={() => setView('gallery')}
                  className={cn(
                    'rounded-full px-3 py-1 transition',
                    view === 'gallery'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-accent hover:text-foreground'
                  )}
                >
                  Gallery
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>{selectedFiles.length} selected</span>
                <span aria-hidden>•</span>
                <span>
                  {selectedSize > 0 ? formatBytes(selectedSize) : '0 B'}
                </span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection} disabled={!selectedFiles.length}>
                Clear
              </Button>
              <Button type="button" size="sm" onClick={handleDownloadSelection} disabled={!selectedFiles.length}>
                Download selection
              </Button>
            </div>
          </header>

          {view === 'tree' ? (
            <ArchiveTree
              nodes={tree}
              selected={selected}
              openPaths={openPaths}
              onToggleOpen={(path, open) => {
                setOpenPaths((prev) => {
                  const next = new Set(prev);
                  if (open) {
                    next.add(path);
                  } else {
                    next.delete(path);
                  }
                  return next;
                });
              }}
              onSelectFile={handleSelectFile}
              onSelectDirectory={handleSelectDirectory}
              onDownloadFile={handleDownloadSingle}
            />
          ) : (
            <ArchiveGallery
              previews={galleryPreviews}
              selected={selected}
              onToggle={(entry, checked) => handleSelectFile(entry.path, checked)}
              onDownload={handleDownloadSingle}
            />
          )}
        </section>
      )}
    </div>
  );
}

type ArchiveTreeProps = {
  nodes: ArchiveTreeNode[];
  selected: Set<string>;
  openPaths: Set<string>;
  onToggleOpen: (path: string, open: boolean) => void;
  onSelectFile: (path: string, checked: boolean) => void;
  onSelectDirectory: (node: ArchiveTreeNode, checked: boolean) => void;
  onDownloadFile: (entry: ArchiveFileEntry) => void;
};

function ArchiveTree({
  nodes,
  selected,
  openPaths,
  onToggleOpen,
  onSelectFile,
  onSelectDirectory,
  onDownloadFile
}: ArchiveTreeProps) {
  if (!nodes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/40 p-10 text-center text-sm text-muted">
        Empty archive or unsupported structure.
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <aside className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-muted">Folder hierarchy</h3>
        <ul role="tree" className="space-y-2 text-sm">
          {nodes.map((node) => (
            <TreeNode
              key={node.path || node.name}
              node={node}
              depth={0}
              selected={selected}
              openPaths={openPaths}
              onToggleOpen={onToggleOpen}
              onSelectFile={onSelectFile}
              onSelectDirectory={onSelectDirectory}
              onDownloadFile={onDownloadFile}
            />
          ))}
        </ul>
      </aside>
      <div className="min-h-[16rem] rounded-2xl border border-border/40 bg-surface p-6 text-sm text-muted shadow-sm">
        <p>Select items from the tree to download them individually or as a group.</p>
      </div>
    </div>
  );
}

type TreeNodeProps = {
  node: ArchiveTreeNode;
  depth: number;
  selected: Set<string>;
  openPaths: Set<string>;
  onToggleOpen: (path: string, open: boolean) => void;
  onSelectFile: (path: string, checked: boolean) => void;
  onSelectDirectory: (node: ArchiveTreeNode, checked: boolean) => void;
  onDownloadFile: (entry: ArchiveFileEntry) => void;
};

function TreeNode({
  node,
  depth,
  selected,
  openPaths,
  onToggleOpen,
  onSelectFile,
  onSelectDirectory,
  onDownloadFile
}: TreeNodeProps) {
  const padding = depth * 12;
  const handleDirectoryToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onSelectDirectory(node, event.target.checked);
    },
    [node, onSelectDirectory]
  );
  const handleFileToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!node.entry) return;
      onSelectFile(node.entry.path, event.target.checked);
    },
    [node, onSelectFile]
  );

  if (node.isDirectory) {
    const { checked, indeterminate } = computeDirectoryState(node, selected);
    return (
      <li role="treeitem" aria-expanded={openPaths.has(node.path)}>
        <details
          open={openPaths.has(node.path) || depth === 0}
          onToggle={(event) => onToggleOpen(node.path, event.currentTarget.open)}
          className="group"
        >
          <summary className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-foreground hover:bg-accent">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={checked}
              ref={(input) => {
                if (input) input.indeterminate = indeterminate;
              }}
              onChange={handleDirectoryToggle}
              onClick={(event) => event.stopPropagation()}
            />
            <span className="font-medium">{node.name || 'Archive root'}</span>
            <span className="text-xs text-muted">{node.children.length} items</span>
          </summary>
          {node.children.length > 0 && (
            <ul role="group" className="ml-4 border-l border-border/40 pl-4">
              {node.children.map((child) => (
                <TreeNode
                  key={child.path || child.name}
                  node={child}
                  depth={depth + 1}
                  selected={selected}
                  openPaths={openPaths}
                  onToggleOpen={onToggleOpen}
                  onSelectFile={onSelectFile}
                  onSelectDirectory={onSelectDirectory}
                  onDownloadFile={onDownloadFile}
                />
              ))}
            </ul>
          )}
        </details>
      </li>
    );
  }

  const isChecked = node.entry ? selected.has(node.entry.path) : false;

  const entry = node.entry;

  return (
    <li
      role="treeitem"
      className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-muted hover:bg-accent"
      style={{ paddingLeft: `${padding + 12}px` }}
    >
      <label className="flex flex-1 items-center gap-2 text-foreground">
        <input type="checkbox" className="h-4 w-4" checked={isChecked} onChange={handleFileToggle} />
        <span className="truncate">{node.name}</span>
      </label>
      <span className="ml-3 text-xs text-muted">{formatBytes(node.entry?.size ?? 0)}</span>
      {entry && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onDownloadFile(entry)}>
          Save
        </Button>
      )}
    </li>
  );
}

type ArchiveGalleryProps = {
  previews: { entry: ArchiveFileEntry; url: string | undefined }[];
  selected: Set<string>;
  onToggle: (entry: ArchiveFileEntry, checked: boolean) => void;
  onDownload: (entry: ArchiveFileEntry) => void;
};

function ArchiveGallery({ previews, selected, onToggle, onDownload }: ArchiveGalleryProps) {
  if (!previews.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/40 p-10 text-center text-sm text-muted">
        No images detected in this archive yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {previews.map(({ entry, url }) => {
        const isChecked = selected.has(entry.path);
        return (
          <figure
            key={entry.path}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-surface shadow-sm"
          >
            <label className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-foreground/90 px-3 py-1 text-xs text-background">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={isChecked}
                onChange={(event) => onToggle(entry, event.target.checked)}
              />
              {entry.name}
            </label>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={entry.name}
                className="h-48 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted">Preview unavailable</div>
            )}
            <figcaption className="flex items-center justify-between px-4 py-3 text-xs text-muted">
              <span>{formatBytes(entry.size)}</span>
              <button type="button" className="text-primary hover:underline" onClick={() => onDownload(entry)}>
                Save
              </button>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
