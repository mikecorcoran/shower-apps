import JSZip from 'jszip';
import { decompressSync } from 'fflate';

export type ArchiveType = 'zip' | 'tar' | 'gz' | 'tar.gz' | '7z';

export type ArchiveFileEntry = {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
  data?: Uint8Array;
  mimeType?: string;
};

export type ArchiveTreeNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  children: ArchiveTreeNode[];
  entry?: ArchiveFileEntry;
};

const MIME_OVERRIDES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml'
};

export function guessMimeType(name: string | undefined) {
  if (!name) return undefined;
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  return MIME_OVERRIDES[ext];
}

export async function extractArchive(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  return extractArchiveFromBuffer(file.name, buffer);
}

export async function extractArchiveFromBuffer(name: string, buffer: Uint8Array) {
  const type = detectArchiveType(name, buffer);
  switch (type) {
    case 'zip':
      return extractZip(buffer);
    case 'tar':
      return extractTar(buffer);
    case 'tar.gz': {
      const ungzipped = decompressSync(buffer);
      return extractTar(ungzipped);
    }
    case 'gz': {
      const ungzipped = decompressSync(buffer);
      const bareName = name.replace(/\.(gz|gzip)$/i, '');
      return [
        {
          path: normalizePath(bareName),
          name: bareName.split('/').pop() ?? bareName,
          isDirectory: false,
          size: ungzipped.byteLength,
          data: ungzipped,
          mimeType: guessMimeType(bareName)
        }
      ];
    }
    case '7z':
      return extract7z(buffer);
    default:
      throw new Error('Unsupported archive format');
  }
}

function detectArchiveType(name: string, buffer: Uint8Array): ArchiveType | 'unknown' {
  const lower = name.toLowerCase();
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return 'zip';
  }
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
      return 'tar.gz';
    }
    return 'gz';
  }
  if (
    buffer[0] === 0x37 &&
    buffer[1] === 0x7a &&
    buffer[2] === 0xbc &&
    buffer[3] === 0xaf &&
    buffer[4] === 0x27 &&
    buffer[5] === 0x1c
  ) {
    return '7z';
  }
  if (lower.endsWith('.tar')) {
    return 'tar';
  }
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return 'tar.gz';
  }
  return 'unknown';
}

async function extractZip(buffer: Uint8Array): Promise<ArchiveFileEntry[]> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: ArchiveFileEntry[] = [];
  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir) {
        const normalized = normalizePath(entry.name.replace(/\/$/, ''));
        if (!normalized) return;
        entries.push({
          path: normalized,
          name: normalized.split('/').pop() ?? normalized,
          isDirectory: true,
          size: 0
        });
        return;
      }
      const data = await entry.async('uint8array');
      const path = normalizePath(entry.name);
      if (!path) return;
      entries.push({
        path,
        name: path.split('/').pop() ?? path,
        isDirectory: false,
        size: data.byteLength,
        data,
        mimeType: guessMimeType(path)
      });
    })
  );
  ensureParentDirectories(entries);
  return entries;
}

function extractTar(buffer: Uint8Array): ArchiveFileEntry[] {
  const entries: ArchiveFileEntry[] = [];
  const blockSize = 512;
  let offset = 0;
  while (offset + blockSize <= buffer.byteLength) {
    const header = buffer.subarray(offset, offset + blockSize);
    if (isEmptyBlock(header)) {
      break;
    }
    const name = readString(header, 0, 100);
    const sizeOctal = readString(header, 124, 12).trim();
    const typeFlag = header[156];
    const size = sizeOctal ? parseInt(sizeOctal, 8) : 0;
    const normalizedName = normalizePath(name.replace(/\/$/, ''));
    const isDirectory = typeFlag === 53 /* '5' */ || name.endsWith('/');
    const dataStart = offset + blockSize;
    const dataEnd = dataStart + size;
    const data = buffer.slice(dataStart, dataEnd);
    if (normalizedName) {
      entries.push({
        path: normalizedName,
        name: normalizedName.split('/').pop() ?? normalizedName,
        isDirectory,
        size,
        data: isDirectory ? undefined : data,
        mimeType: isDirectory ? undefined : guessMimeType(normalizedName)
      });
    }
    const paddedSize = Math.ceil(size / blockSize) * blockSize;
    offset = dataStart + paddedSize;
  }
  ensureParentDirectories(entries);
  return entries;
}

async function extract7z(buffer: Uint8Array): Promise<ArchiveFileEntry[]> {
  const sevenZipModule = await import('7z-wasm');
  const initSevenZip =
    (sevenZipModule.default as (() => Promise<any>) | undefined) ??
    (sevenZipModule as unknown as { initSevenZip?: () => Promise<any> }).initSevenZip ??
    (sevenZipModule as unknown as { SevenZip?: () => Promise<any> }).SevenZip;
  if (!initSevenZip) {
    throw new Error('7z support is not available in this environment');
  }
  const instance = await initSevenZip();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const tmpName = `/tmp-${id}.7z`;
  instance.FS.writeFile(tmpName, buffer);
  const outputDir = `/out-${id}`;
  instance.FS.mkdir(outputDir);
  try {
    instance.callMain(['x', tmpName, `-o${outputDir}`, '-y']);
  } catch (error) {
    throw new Error('Failed to extract 7z archive');
  }
  const entries: ArchiveFileEntry[] = [];
  const traverse = (dir: string) => {
    const listing = instance.FS.readdir(dir);
    for (const item of listing) {
      if (item === '.' || item === '..') continue;
      const fullPath = `${dir}/${item}`;
      const stats = instance.FS.stat(fullPath);
      const relative = normalizePath(fullPath.replace(`${outputDir}/`, ''));
      if (!relative) continue;
      if (stats.isDirectory()) {
        entries.push({ path: relative, name: item, isDirectory: true, size: 0 });
        traverse(fullPath);
      } else {
        const data = instance.FS.readFile(fullPath);
        entries.push({
          path: relative,
          name: item,
          isDirectory: false,
          size: data.byteLength,
          data,
          mimeType: guessMimeType(item)
        });
      }
    }
  };
  traverse(outputDir);
  ensureParentDirectories(entries);
  return entries;
}

function normalizePath(path: string) {
  return path.replace(/^\/+/, '').replace(/\\/g, '/');
}

function ensureParentDirectories(entries: ArchiveFileEntry[]) {
  const directories = entries.filter((entry) => entry.isDirectory);
  const existing = new Set(directories.map((entry) => entry.path));
  const snapshot = [...entries];
  for (const entry of snapshot) {
    const segments = entry.path.split('/').filter(Boolean);
    segments.pop();
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!existing.has(current)) {
        existing.add(current);
        entries.push({ path: current, name: segment, isDirectory: true, size: 0 });
      }
    }
  }
}

function isEmptyBlock(block: Uint8Array) {
  for (let i = 0; i < block.length; i += 1) {
    if (block[i] !== 0) return false;
  }
  return true;
}

function readString(buffer: Uint8Array, start: number, length: number) {
  const slice = buffer.subarray(start, start + length);
  let end = slice.length;
  for (let i = 0; i < slice.length; i += 1) {
    if (slice[i] === 0) {
      end = i;
      break;
    }
  }
  return new TextDecoder().decode(slice.subarray(0, end));
}

export function buildArchiveTree(entries: ArchiveFileEntry[]): ArchiveTreeNode[] {
  const root: ArchiveTreeNode = {
    name: '',
    path: '',
    isDirectory: true,
    size: 0,
    children: []
  };

  const ensureDirectory = (segments: string[]): ArchiveTreeNode => {
    let current = root;
    let currentPath = '';
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let child = current.children.find((node) => node.isDirectory && node.name === segment);
      if (!child) {
        child = {
          name: segment,
          path: currentPath,
          isDirectory: true,
          size: 0,
          children: []
        };
        current.children.push(child);
      }
      current = child;
    }
    return current;
  };

  entries
    .filter((entry) => entry.isDirectory)
    .forEach((entry) => {
      const segments = entry.path.split('/').filter(Boolean);
      ensureDirectory(segments);
    });

  entries
    .filter((entry) => !entry.isDirectory)
    .forEach((entry) => {
      const segments = entry.path.split('/').filter(Boolean);
      const fileName = segments.pop();
      const parent = ensureDirectory(segments);
      parent.children.push({
        name: fileName ?? entry.name,
        path: entry.path,
        isDirectory: false,
        size: entry.size,
        children: [],
        entry
      });
    });

  const sortNodes = (nodes: ArchiveTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(root.children);

  return root.children;
}

export function flattenFiles(entries: ArchiveTreeNode[]): ArchiveFileEntry[] {
  const files: ArchiveFileEntry[] = [];
  const walk = (nodes: ArchiveTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.entry && !node.isDirectory) {
        files.push(node.entry);
      }
      if (node.children.length) {
        walk(node.children);
      }
    });
  };
  walk(entries);
  return files;
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
