import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LOW_POWER_STORAGE_KEY = 'voicelab_low_power_mode';

export interface LowPowerContextValue {
  manualLowPower: boolean;
  isTabHidden: boolean;
  isStep1Recording: boolean;
  isLowPowerActive: boolean;
  areVisualAnimationsPaused: boolean;
  toggleManualLowPower: () => void;
  setManualLowPower: (enabled: boolean) => void;
  setStep1Recording: (recording: boolean) => void;
}

const LowPowerContext = createContext<LowPowerContextValue | null>(null);

function readInitialManualLowPower(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LOW_POWER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const LowPowerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manualLowPower, setManualLowPowerState] = useState<boolean>(readInitialManualLowPower);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.hidden) : false
  );
  const [isStep1Recording, setIsStep1Recording] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncVisibility = () => {
      setIsTabHidden(Boolean(document.hidden));
    };

    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pageshow', syncVisibility);

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pageshow', syncVisibility);
    };
  }, []);

  const setManualLowPower = useCallback((enabled: boolean) => {
    setManualLowPowerState(enabled);
    try {
      window.localStorage.setItem(LOW_POWER_STORAGE_KEY, String(enabled));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }, []);

  const toggleManualLowPower = useCallback(() => {
    setManualLowPowerState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LOW_POWER_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const isLowPowerActive = manualLowPower || isTabHidden;
  const areVisualAnimationsPaused = isTabHidden || (manualLowPower && !isStep1Recording);

  // Reflect visual pause classes on <html> without ever touching <audio>, fetch, or downloads
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('low-power-tab-hidden', isTabHidden);
    root.classList.toggle('low-power-animations-paused', areVisualAnimationsPaused);

    return () => {
      root.classList.remove('low-power-tab-hidden', 'low-power-animations-paused');
    };
  }, [isTabHidden, areVisualAnimationsPaused]);

  const value = useMemo<LowPowerContextValue>(
    () => ({
      manualLowPower,
      isTabHidden,
      isStep1Recording,
      isLowPowerActive,
      areVisualAnimationsPaused,
      toggleManualLowPower,
      setManualLowPower,
      setStep1Recording: setIsStep1Recording,
    }),
    [
      manualLowPower,
      isTabHidden,
      isStep1Recording,
      isLowPowerActive,
      areVisualAnimationsPaused,
      toggleManualLowPower,
      setManualLowPower,
    ]
  );

  return <LowPowerContext.Provider value={value}>{children}</LowPowerContext.Provider>;
};

export function useLowPower(): LowPowerContextValue {
  const ctx = useContext(LowPowerContext);
  if (!ctx) {
    return {
      manualLowPower: false,
      isTabHidden: false,
      isStep1Recording: false,
      isLowPowerActive: false,
      areVisualAnimationsPaused: false,
      toggleManualLowPower: () => {},
      setManualLowPower: () => {},
      setStep1Recording: () => {},
    };
  }
  return ctx;
}
