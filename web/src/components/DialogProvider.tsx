'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type DialogStackContextValue = {
  /** Live stack of open dialog ids, scoped to this provider's React root. */
  stack: { current: symbol[] };
  register: (id: symbol) => void;
  unregister: (id: symbol) => void;
};

const DialogContext = createContext<DialogStackContextValue | null>(null);

type SavedBodyStyles = {
  overflow: string;
  paddingRight: string;
  overscrollBehavior: string;
  rootOverscrollBehavior: string;
};

/**
 * Provides dialog registration and body scroll-locking for a React root.
 *
 * Unlike module-level mutable state, the open-dialog stack and saved body
 * styles live per provider instance, so multiple roots (or a future
 * micro-frontend split) can never corrupt each other's lock state.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<symbol[]>([]);
  const savedStylesRef = useRef<SavedBodyStyles | null>(null);

  const register = useCallback((id: symbol) => {
    const stack = stackRef.current;
    if (stack.length === 0) {
      savedStylesRef.current = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
        overscrollBehavior: document.body.style.overscrollBehavior,
        rootOverscrollBehavior: document.documentElement.style.overscrollBehavior,
      };

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      if (scrollbarWidth > 0) {
        const existing = parseFloat(document.body.style.paddingRight) || 0;
        document.body.style.paddingRight = `${scrollbarWidth + existing}px`;
      }
    }

    stack.push(id);
  }, []);

  const unregister = useCallback((id: symbol) => {
    const stack = stackRef.current;
    const stackIndex = stack.lastIndexOf(id);
    if (stackIndex >= 0) stack.splice(stackIndex, 1);

    if (stack.length === 0 && savedStylesRef.current) {
      document.body.style.overflow = savedStylesRef.current.overflow;
      document.body.style.paddingRight = savedStylesRef.current.paddingRight;
      document.body.style.overscrollBehavior = savedStylesRef.current.overscrollBehavior;
      document.documentElement.style.overscrollBehavior = savedStylesRef.current.rootOverscrollBehavior;
      savedStylesRef.current = null;
    }
  }, []);

  const value = useMemo<DialogStackContextValue>(
    () => ({ stack: stackRef, register, unregister }),
    [register, unregister],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export function useDialogStack() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogStack must be used within a <DialogProvider>.');
  }
  return context;
}
