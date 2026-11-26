import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type MobilePlatform = 'ios' | 'android' | 'web';

export interface PlatformDesignTokens {
  platform: MobilePlatform;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  triggerTabHaptic: () => void;
  triggerActionHaptic: () => void;
}

/**
 * Provides platform-specific design tokens & native haptic feedback
 * aligned with Apple Human Interface Guidelines (iOS) and Material Design 3 (Android).
 */
export function usePlatformDesign(): PlatformDesignTokens {
  const [platform, setPlatform] = useState<MobilePlatform>('web');

  useEffect(() => {
    try {
      const detected = Capacitor.getPlatform();
      if (detected === 'ios' || detected === 'android') {
        setPlatform(detected);
      } else if (typeof navigator !== 'undefined') {
        // Responsive preview fallback for mobile web browsers
        const ua = navigator.userAgent || '';
        if (/iPad|iPhone|iPod/.test(ua)) {
          setPlatform('ios');
        } else if (/Android/i.test(ua)) {
          setPlatform('android');
        } else {
          setPlatform('web');
        }
      }
    } catch {
      setPlatform('web');
    }
  }, []);

  const triggerTabHaptic = useCallback(() => {
    if (!Capacitor.isNativePlatform()) return;
    Haptics.selectionChanged().catch(() => {});
  }, []);

  const triggerActionHaptic = useCallback(() => {
    if (!Capacitor.isNativePlatform()) return;
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }, []);

  return {
    platform,
    isNative: Capacitor.isNativePlatform(),
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    triggerTabHaptic,
    triggerActionHaptic,
  };
}
