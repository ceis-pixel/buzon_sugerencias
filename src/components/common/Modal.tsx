"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  showCloseButton?: boolean;
}

const sizeClasses = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", full: "max-w-none" } as const;
const scrollLocks = new WeakMap<HTMLElement, { count: number; value: string; priority: string }>();

function lockBodyScroll(body: HTMLElement) {
  const lock = scrollLocks.get(body) ?? {
    count: 0,
    value: body.style.getPropertyValue("overflow"),
    priority: body.style.getPropertyPriority("overflow"),
  };
  lock.count += 1;
  scrollLocks.set(body, lock);
  body.style.setProperty("overflow", "hidden");

  return () => {
    lock.count -= 1;
    if (lock.count === 0) {
      if (lock.value) body.style.setProperty("overflow", lock.value, lock.priority);
      else body.style.removeProperty("overflow");
      scrollLocks.delete(body);
    }
  };
}

function isOutside(dialog: HTMLDialogElement, x: number, y: number) {
  const bounds = dialog.getBoundingClientRect();
  return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pointerStartedOutside = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement;
    dialog.showModal();
    const unlockScroll = lockBodyScroll(document.body);
    headingRef.current?.focus({ preventScroll: true });

    return () => {
      dialog.close();
      unlockScroll();
      const remainingModal = document.querySelector("dialog:modal");
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected &&
        (!remainingModal || remainingModal.contains(previousFocus))) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const dialog = event.currentTarget;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]',
    )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") &&
      !element.closest("[inert]") && element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first) {
      event.preventDefault();
      headingRef.current?.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    // Isolate the top-layer dialog from the parent's sibling-spacing utilities.
    <div className="contents">
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClose={(event) => { if (isOpen && !event.currentTarget.open) onClose(); }}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        pointerStartedOutside.current = event.target === event.currentTarget &&
          isOutside(event.currentTarget, event.clientX, event.clientY);
      }}
      onPointerCancel={() => { pointerStartedOutside.current = false; }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pointerStartedOutside.current &&
          isOutside(event.currentTarget, event.clientX, event.clientY)) onClose();
        pointerStartedOutside.current = false;
      }}
      className={`fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] animate-fade-in overflow-hidden rounded-2xl border border-gray-100 bg-white p-0 font-sans text-neutral-gray shadow-sm backdrop:animate-fade-in backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex open:flex-col motion-reduce:animate-none motion-reduce:backdrop:animate-none ${sizeClasses[size]}`}
    >
      <header className="relative shrink-0 p-6 pb-4">
        <h2 ref={headingRef} id={titleId} tabIndex={-1} className={title ? "pr-10 text-lg font-bold text-primary outline-none" : "sr-only"}>
          {title || "Ventana de información"}
        </h2>
        {description && <p id={descriptionId} className="mt-2 pr-10 text-sm leading-6">{description}</p>}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-xl text-neutral-gray transition-colors hover:bg-neutral-gray/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain break-words px-6 pb-6">{children}</div>
      {footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 p-4 sm:px-6">{footer}</footer>}
    </dialog>
    </div>
  );
}
