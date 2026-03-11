import { useEffect, useRef } from "react";
import { stackPreview } from "../../data/siteContent";

export default function StackPreviewSection() {
  const shellRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      const scrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      shellRef.current?.scrollIntoView({ behavior: scrollBehavior, block: "center" });
      shellRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <section className="stack-preview" aria-labelledby="stack-preview-title">
      <div className="container">
        <div className="stack-preview-shell reveal" ref={shellRef} tabIndex={-1}>
          <h2 id="stack-preview-title" className="sr-only">{stackPreview.ariaLabel}</h2>

          <ul className="stack-preview-list" aria-label={stackPreview.ariaLabel}>
            {stackPreview.items.map((item) => (
              <li
                key={item.id}
                className={`stack-preview-item${item.active ? " is-active" : ""}`}
                aria-current={item.active ? "true" : undefined}
              >
                {item.text ? (
                  item.text
                ) : (
                  <>
                    {item.prefix}
                    <span className="stack-preview-accent">{item.accent}</span>
                    {item.suffix}
                  </>
                )}
              </li>
            ))}
          </ul>

          <p className="stack-preview-hint">
            <span className="stack-preview-key" aria-hidden="true">/</span>
            <span>{stackPreview.hint}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
