"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Id of the element that titles the drawer. */
  labelledBy: string;
  children: ReactNode;
}

/**
 * Side sheet built on the native modal dialog: full screen on phones, a
 * right-hand panel on larger screens. The browser supplies the focus trap,
 * the inert background and Escape handling.
 */
export function Drawer({ isOpen, onClose, labelledBy, children }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  return (
    // Isolate the top-layer dialog from the parent's sibling-spacing utilities.
    <div className="contents">
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={labelledBy}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        onClose={(event) => {
          if (isOpen && !event.currentTarget.open) onClose();
        }}
        onClick={(event) => {
          // Only the backdrop reports the dialog itself as the click target.
          if (event.target === event.currentTarget) onClose();
        }}
        className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-[100dvh] w-full max-w-full animate-slide-in-right flex-col overflow-hidden border-l border-gray-200 bg-slate-50 p-0 font-sans text-gray-900 shadow-2xl backdrop:animate-fade-in backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex motion-reduce:animate-none motion-reduce:backdrop:animate-none sm:max-w-xl"
      >
        {isOpen ? children : null}
      </dialog>
    </div>
  );
}
