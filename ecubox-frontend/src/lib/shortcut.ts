export function getSearchShortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl+K';
  const navigatorWithUA = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = (navigatorWithUA.userAgentData?.platform || navigator.platform || '').toLowerCase();
  return /mac|iphone|ipad|ipod/.test(platform) ? '⌘K' : 'Ctrl+K';
}
