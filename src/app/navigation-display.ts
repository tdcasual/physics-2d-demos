export function toNavFileName(path: string): string {
  const raw = String(path ?? '').trim();
  if (!raw) return 'index.html';

  const noQuery = raw.split('#')[0]?.split('?')[0] ?? raw;
  const segments = noQuery.split('/').filter((segment) => segment.length > 0);
  const fileName = segments[segments.length - 1] ?? '';

  if (!fileName) return 'index.html';

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}
