import { useEffect, useRef, useState, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function visibleItems(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * Modal-dialog behaviour shared by the subject picker and the path drawer:
 * traps Tab inside the container, moves focus in on open (first
 * `[data-autofocus]`, else first focusable, else the container itself),
 * calls `onEscape` on Escape, and restores focus to whatever was focused
 * before the dialog opened.
 *
 * The container element must be rendered only while `open` is true and
 * carry `tabIndex={-1}` so it can take fallback focus.
 */
export function useDialogA11y({
  open,
  containerRef,
  onEscape,
}: {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}) {
  const restoreRef = useRef<HTMLElement | null>(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!open) return;
    const node = containerRef.current;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const initial =
      node?.querySelector<HTMLElement>("[data-autofocus]") ??
      (node ? visibleItems(node)[0] : undefined);
    (initial ?? node)?.focus?.();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = visibleItems(node);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active !== null && node.contains(active);
      if (event.shiftKey) {
        if (!inside || active === first) {
          last.focus();
          event.preventDefault();
        }
      } else if (!inside || active === last) {
        first.focus();
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreRef.current?.focus?.();
      restoreRef.current = null;
    };
  }, [open, containerRef]);
}

/** Live `prefers-reduced-motion` — components also honor it in CSS, but
 *  JS choreography (staggers, auto-camera moves) should branch on this. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
