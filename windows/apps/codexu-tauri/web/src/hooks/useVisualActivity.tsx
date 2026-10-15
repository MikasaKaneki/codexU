import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauriRuntimeAvailable } from '../utils/tauri';

const VisualActivity = createContext(false);

export function VisualActivityProvider({ children }: { children: ReactNode }) {
  const native = isTauriRuntimeAvailable();
  const [focused, setFocused] = useState(() => document.hasFocus());
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [nativeFocused, setNativeFocused] = useState(!native);
  const [powerSave, setPowerSave] = useState(native);

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const onFocus = () => setFocused(document.hasFocus());
    const onBlur = () => setFocused(false);
    const onVisibility = () => { setVisible(document.visibilityState === 'visible'); onFocus(); };
    const onMotion = () => setReduced(motion.matches);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    let disposed = false;
    let powerRevision = 0;
    let focusRevision = 0;
    const disposers: UnlistenFn[] = [];
    const retain = (dispose: UnlistenFn) => disposed ? dispose() : disposers.push(dispose);
    if (native) {
      void (async () => {
        try {
          retain(await listen<boolean>('visual-power-save', ({ payload }) => {
            powerRevision++; if (!disposed) setPowerSave(payload);
          }));
          retain(await getCurrentWindow().onFocusChanged(({ payload }) => {
            focusRevision++;
            if (!disposed) setNativeFocused(payload);
          }));
          const revision = powerRevision;
          const focus = focusRevision;
          const [saving, focused] = await Promise.all([
            invoke<boolean>('get_visual_power_save'), getCurrentWindow().isFocused(),
          ]);
          if (!disposed) {
            if (revision === powerRevision) setPowerSave(saving);
            if (focus === focusRevision) setNativeFocused(focused);
          }
        } catch { if (!disposed) setPowerSave(true); }
      })();
    }
    return () => {
      disposed = true;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      disposers.forEach(dispose => dispose());
    };
  }, [native]);

  return <VisualActivity.Provider value={focused && visible && !reduced && nativeFocused && !powerSave}>
    {children}
  </VisualActivity.Provider>;
}

export function useVisualActivity<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const activeWindow = useContext(VisualActivity);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, active: activeWindow && inView };
}
