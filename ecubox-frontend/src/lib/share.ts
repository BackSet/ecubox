import { copyText } from '@/lib/clipboard';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

interface ShareWithFallbackOptions {
  data: ShareData;
  fallbackText: string;
}

function isShareCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

export async function shareWithFallback({
  data,
  fallbackText,
}: ShareWithFallbackOptions): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (isShareCancellation(error)) {
        return 'cancelled';
      }
    }
  }

  try {
    await copyText(fallbackText);
    return 'copied';
  } catch {
    return 'failed';
  }
}
