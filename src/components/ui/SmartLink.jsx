export default function SmartLink({
  children,
  className,
  external,
  href,
  id,
  onClick,
  onNavigate,
  prefersReducedMotion,
  rel,
  style,
  target,
  trackData,
  trackEvent,
  trackName,
  ...props
}) {
  const emit = trackEvent || (() => {});

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    const basePayload = {
      href: href || "",
      id: id || "",
      text: event.currentTarget.textContent?.trim().slice(0, 64) || "",
      ...(trackData || {})
    };

    if (href?.startsWith("#") && href !== "#") {
      const targetElement = document.querySelector(href);
      if (targetElement) {
        event.preventDefault();
        targetElement.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start"
        });
        emit(trackName || "anchor_click", basePayload);
        onNavigate?.();
        return;
      }
    }

    if (trackName) {
      emit(trackName, basePayload);
    }
    onNavigate?.();
  };

  return (
    <a
      {...props}
      className={className}
      href={href}
      id={id}
      onClick={handleClick}
      rel={external ? (rel || "noopener") : rel}
      style={style}
      target={external ? (target || "_blank") : target}
    >
      {children}
    </a>
  );
}
