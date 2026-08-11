'use client';

import {
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useDialogStack } from '@/components/DialogProvider';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => (
    element.getAttribute('aria-hidden') !== 'true'
    && element.getClientRects().length > 0
  ));
}

export type DialogBackdropRenderProps = HTMLAttributes<HTMLDivElement>;

export type DialogPanelRenderProps = HTMLAttributes<HTMLDivElement> & {
  ref: (node: HTMLDivElement | null) => void;
};

type DialogChildRenderProps = {
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode | ((props: DialogChildRenderProps) => ReactNode);
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  /** Prevents backdrop/Escape dismissal when true. Also disables the close button when used with DialogHeader. */
  busy?: boolean;
  backdropClassName?: string;
  panelClassName?: string;
  renderBackdrop?: (props: DialogBackdropRenderProps, panel: ReactNode) => ReactNode;
  renderPanel?: (props: DialogPanelRenderProps) => ReactNode;
}

/**
 * Accessible modal dialog shell. Visual styling remains caller-owned so each
 * product surface can retain its existing design while sharing interaction
 * and focus behavior.
 */
export default function Dialog({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  ariaLabel,
  initialFocusRef,
  busy = false,
  backdropClassName = '',
  panelClassName = '',
  renderBackdrop,
  renderPanel,
}: DialogProps) {
  const mountedRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dialogIdRef = useRef(Symbol('dialog'));
  const onCloseRef = useRef(onClose);
  const initialFocusRefRef = useRef(initialFocusRef);
  const busyRef = useRef(busy);
  const [, setMounted] = useState(false);
  const { stack, register, unregister } = useDialogStack();

  const setPanelRef = useCallback((node: HTMLDivElement | null) => {
    panelRef.current = node;
  }, []);

  const handleBackdropMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!busyRef.current && event.target === event.currentTarget) {
      onCloseRef.current();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
    initialFocusRefRef.current = initialFocusRef;
    busyRef.current = busy;
  }, [busy, initialFocusRef, onClose]);

  useEffect(() => {
    if (!open || !mountedRef.current) return undefined;

    const dialogId = dialogIdRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    register(dialogId);

    // Focusable-node cache: build once per dialog content, then revalidate
    // cheaply on Tab instead of re-querying the panel on every keypress.
    // A MutationObserver invalidates the cache when content changes (e.g. a
    // modal swapping between confirmation and success states).
    let focusableCache: HTMLElement[] | null = null;
    let observer: MutationObserver | null = null;

    const invalidateCache = () => {
      focusableCache = null;
    };

    const getCachedFocusableElements = (panel: HTMLElement): HTMLElement[] => {
      if (focusableCache === null) {
        focusableCache = getFocusableElements(panel);
        return focusableCache;
      }

      // Cheap revalidation — no layout reads on the hot path. Handles nodes
      // detached or disabled since the list was built; structural and
      // class/style/disabled changes are caught by the observer instead.
      const live = focusableCache.filter(
        (element) => element.isConnected && !element.matches(':disabled'),
      );
      if (live.length > 0) return live;

      focusableCache = getFocusableElements(panel);
      return focusableCache;
    };

    const panel = panelRef.current;
    if (panel) {
      observer = new MutationObserver(invalidateCache);
      observer.observe(panel, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'disabled', 'aria-hidden'],
      });
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const currentPanel = panelRef.current;
      if (!currentPanel) return;

      const requestedTarget = initialFocusRefRef.current?.current;
      const canFocusRequestedTarget = requestedTarget
        && currentPanel.contains(requestedTarget)
        && !requestedTarget.matches(':disabled')
        && requestedTarget.getClientRects().length > 0;
      const target = canFocusRequestedTarget
        ? requestedTarget
        : getCachedFocusableElements(currentPanel)[0] ?? currentPanel;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (stack.current[stack.current.length - 1] !== dialogId) return;

      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const currentPanel = panelRef.current;
      if (!currentPanel) return;
      const focusableElements = getCachedFocusableElements(currentPanel);

      if (focusableElements.length === 0) {
        event.preventDefault();
        currentPanel.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !currentPanel.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      observer?.disconnect();
      focusableCache = null;

      unregister(dialogId);

      // Only restore focus when no other dialogs remain open.
      if (stack.current.length === 0 && previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open || !mountedRef.current) return null;

  const resolvedChildren = typeof children === 'function'
    ? children({ labelledBy, describedBy, ariaLabel })
    : children;

  const panelProps: DialogPanelRenderProps = {
    ref: setPanelRef,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-label': ariaLabel,
    tabIndex: -1,
    className: panelClassName,
    children: resolvedChildren,
  };

  const backdropProps: DialogBackdropRenderProps = {
    className: `fixed inset-0 overflow-y-auto overscroll-contain ${backdropClassName}`,
    onMouseDown: handleBackdropMouseDown,
  };
  const panel = renderPanel ? renderPanel(panelProps) : <div {...panelProps} />;

  return createPortal(
    renderBackdrop ? renderBackdrop(backdropProps, panel) : <div {...backdropProps}>{panel}</div>,
    document.body,
  );
}
