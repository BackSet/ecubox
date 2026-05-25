import type { SnapshotOptions } from '@/lib/exporters/domSnapshot';

/** Ancho fijo (~A4 útil) para capturas de tracking estables en cualquier viewport. */
export const TRACKING_SNAPSHOT_WIDTH = 820;

export function isExportExcludedNode(node: HTMLElement): boolean {
  return node.dataset?.exportExclude !== undefined;
}

export const TRACKING_SNAPSHOT_OPTIONS: SnapshotOptions = {
  width: TRACKING_SNAPSHOT_WIDTH,
  background: '#FFFFFF',
  scale: 2,
  filter: (node) => !isExportExcludedNode(node),
};
