import { useEffect, useRef } from "react";

function getFocusableElements(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')
  ).filter((element) => element.offsetParent !== null);
}

export function useFocusTrap(rootRef, active) {
  const lastActiveRef = useRef(null);

  useEffect(() => {
    if (!active || !rootRef.current) return undefined;

    lastActiveRef.current = document.activeElement;

    const handleKeyDown = (event) => {
      if (event.key !== "Tab" || !rootRef.current) return;

      const items = getFocusableElements(rootRef.current);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lastActiveRef.current && typeof lastActiveRef.current.focus === "function") {
        lastActiveRef.current.focus();
      }
      lastActiveRef.current = null;
    };
  }, [active, rootRef]);
}
