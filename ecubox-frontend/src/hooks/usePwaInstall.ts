import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  detectInstallBrowser,
  detectInstallPlatform,
  isInAppBrowser,
  isStandalonePwa,
  requiresManualInstallGuide,
  type InstallBrowser,
  type InstallPlatform,
  type InstallPromptEvent,
} from '@/lib/pwa';

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa);
  const [guideOpen, setGuideOpen] = useState(false);
  const [nativeDismissed, setNativeDismissed] = useState(false);
  const [browser, setBrowser] = useState<InstallBrowser>(() =>
    typeof navigator !== 'undefined' ? detectInstallBrowser() : 'other'
  );
  const [platform, setPlatform] = useState<InstallPlatform>(() =>
    typeof navigator !== 'undefined' ? detectInstallPlatform() : 'desktop'
  );

  useEffect(() => {
    setIsInstalled(isStandalonePwa());
    setBrowser(detectInstallBrowser());
    setPlatform(detectInstallPlatform());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const openInstallGuide = useCallback(() => {
    setGuideOpen(true);
  }, []);

  const requestInstall = useCallback(async () => {
    if (isInstalled) return;

    if (isInAppBrowser()) {
      setGuideOpen(true);
      return;
    }

    if (requiresManualInstallGuide(platform, installPrompt !== null)) {
      setGuideOpen(true);
      return;
    }

    const promptEvent = installPrompt;
    if (!promptEvent) {
      setGuideOpen(true);
      return;
    }

    try {
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      setInstallPrompt(null);
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        toast.success('ECUBOX agregado a tu dispositivo');
      } else {
        setNativeDismissed(true);
        setGuideOpen(true);
      }
    } catch {
      setInstallPrompt(null);
      setGuideOpen(true);
    }
  }, [installPrompt, isInstalled, platform]);

  return {
    isInstalled,
    browser,
    platform,
    canUseNativeInstall: installPrompt !== null,
    guideOpen,
    setGuideOpen,
    requestInstall,
    openInstallGuide,
    isInAppBrowser: isInAppBrowser(),
    nativeDismissed,
  };
}
