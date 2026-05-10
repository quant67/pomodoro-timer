import { useState, useCallback } from 'react';
import type { JsonStorageAdapter, SoundSettings } from './types';
import { browserStorage } from './utils';

export function useSound(storage: JsonStorageAdapter = browserStorage) {
  const [settings, setSettings] = useState<SoundSettings>(() =>
    storage.load<SoundSettings>('tomato-sound', { enabled: true }),
  );

  const toggle = useCallback(() => {
    setSettings((prev) => {
      const next = { enabled: !prev.enabled };
      storage.save('tomato-sound', next);
      return next;
    });
  }, [storage]);

  return { soundEnabled: settings.enabled, toggleSound: toggle };
}
