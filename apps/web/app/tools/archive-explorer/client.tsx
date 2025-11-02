'use client';

import type { ChangeEvent, CSSProperties } from 'react';
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
    <div className="space-y-8">
      <section
        {...getRootProps({
          className: cn(
            'flex cursor-pointer flex-col items-center justify-center gap-5 rounded-[1.75rem] border border-dashed border-border/60 bg-surface/95 px-6 py-16 text-center shadow-[0_1px_4px_rgba(15,23,42,0.08)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_12px_32px_-20px_rgba(79,70,229,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40 motion-reduce:transition-none',
            isDragActive && 'border-primary/60 bg-primary/12 shadow-[0_12px_28px_-18px_rgba(79,70,229,0.5)]'
          )
        })}
      >
        <input {...getInputProps()} />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/12 text-primary shadow-inner">
          <span aria-hidden className="text-2xl">
            📦
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold tracking-tight text-foreground">Drop or select an archive</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Zip, Tar, GZip, Tar.Gz, 7z — everything stays in the browser. Files never leave your device.
          </p>
        </div>
        <Button type="button" onClick={open} disabled={isProcessing}>
          Browse files
        </Button>
        {error && <p className="text-sm font-medium text-red-500 dark:text-red-400">{error}</p>}
        {isProcessing && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Processing archive…</p>
        )}
      </section>

      {hasArchive && (
        <section className="space-y-6 rounded-[1.75rem] border border-border/60 bg-surface/95 p-6 shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:p-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Loaded archive</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{archiveName}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-border/70 bg-background/80 p-1 text-sm shadow-inner backdrop-blur">
                <button
                  type="button"
                  onClick={() => setView('tree')}
                  className={cn(
                    'rounded-full px-3 py-1.5 font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40',
                    view === 'tree'
                      ? 'bg-primary/15 text-primary shadow-sm'
                      : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                  )}
                >
                  Hierarchy
                </button>
                <button
                  type="button"
                  onClick={() => setView('gallery')}
                  className={cn(
                    'rounded-full px-3 py-1.5 font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40',
                    view === 'gallery'
                      ? 'bg-primary/15 text-primary shadow-sm'
                      : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                  )}
                >
                  Gallery
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{selectedFiles.length} selected</span>
                <span aria-hidden>•</span>
                <span className="tabular-nums">
                  {selectedSize > 0 ? formatBytes(selectedSize) : '0 B'}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={!selectedFiles.length}
              >
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
      <div className="rounded-[1.5rem] border border-dashed border-border/50 bg-background/60 p-10 text-center text-sm text-muted">
        Empty archive or unsupported structure.
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-surface/95 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[36rem]">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border/60 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <span className="text-left">Select</span>
              <span>Name</span>
              <span className="text-right">Size</span>
              <span className="text-right">Save</span>
            </div>
            <div className="max-h-[28rem] overflow-y-auto">
              <ul role="tree" className="divide-y divide-border/50 list-none">
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
            </div>
          </div>
        </div>
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
  const offset: CSSProperties = { paddingLeft: `${depth * 1.25}rem` };
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
    const isOpen = openPaths.has(node.path) || depth === 0;

    return (
      <li role="treeitem" aria-expanded={isOpen}>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 bg-background/40 px-5 py-3 text-sm text-foreground transition-colors duration-150 hover:bg-foreground/5">
          <div className="flex items-center gap-2" style={offset}>
            <button
              type="button"
              onClick={() => onToggleOpen(node.path, !isOpen)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/80 text-sm font-semibold text-muted transition-colors duration-150 hover:border-primary/40 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40"
              aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
            >
              {isOpen ? '–' : '+'}
            </button>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary/40"
              checked={checked}
              ref={(input) => {
                if (input) input.indeterminate = indeterminate;
              }}
              onChange={handleDirectoryToggle}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground" title={node.name || 'Archive root'}>
              {node.name || 'Archive root'}
            </p>
            <p className="text-xs text-muted">{node.children.length} items</p>
          </div>
          <span className="text-right text-xs text-muted tabular-nums">—</span>
          <span className="h-6" aria-hidden />
        </div>
        {isOpen && node.children.length > 0 && (
          <ul role="group" className="divide-y divide-border/50 list-none">
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
      </li>
    );
  }

  const entry = node.entry;
  const isChecked = entry ? selected.has(entry.path) : false;

  return (
    <li role="treeitem">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3 text-sm text-foreground transition-colors duration-150 hover:bg-foreground/5">
        <div className="flex items-center gap-2" style={offset}>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/70 text-xs text-muted">
            •
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary/40"
            checked={isChecked}
            onChange={handleFileToggle}
          />
        </div>
        <p className="truncate" title={node.name}>
          {node.name}
        </p>
        <span className="text-right text-xs text-muted tabular-nums">{formatBytes(node.entry?.size ?? 0)}</span>
        {entry ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-3"
              onClick={() => onDownloadFile(entry)}
            >
              Save
            </Button>
          </div>
        ) : (
          <span className="h-6" aria-hidden />
        )}
      </div>
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
      <div className="rounded-[1.5rem] border border-dashed border-border/50 bg-background/60 p-10 text-center text-sm text-muted">
        No images detected in this archive yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {previews.map(({ entry, url }) => {
        const isChecked = selected.has(entry.path);
        const checkboxId = `select-${entry.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        return (
          <figure
            key={entry.path}
            className="group flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-border/60 bg-surface/95 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_34px_-20px_rgba(79,70,229,0.45)] motion-reduce:transition-none"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-background/70">
              <label
                htmlFor={checkboxId}
                className={cn(
                  'absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors duration-150',
                  isChecked && 'border-primary/40 bg-primary/15 text-primary'
                )}
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary/40"
                  checked={isChecked}
                  onChange={(event) => onToggle(entry, event.target.checked)}
                />
                Select
              </label>
              <span className="absolute bottom-3 left-3 z-10 inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
                {formatBytes(entry.size ?? 0)}
              </span>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={entry.name}
                  className="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">Preview unavailable</div>
              )}
            </div>
            <figcaption className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
              <span className="truncate font-medium text-foreground" title={entry.name}>
                {entry.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-3"
                onClick={() => onDownload(entry)}
              >
                Save
              </Button>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
