import { useEffect, useState } from "react";

export function useActiveSection(sectionIds) {
  const [activeSectionId, setActiveSectionId] = useState(() => sectionIds[0] || "");
  const sectionKey = sectionIds.join("|");

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) return undefined;

    const pickByScroll = () => {
      const pivot = window.scrollY + (window.innerHeight * 0.35);
      let currentId = sections[0].id;

      for (let index = 0; index < sections.length; index += 1) {
        if (pivot >= sections[index].offsetTop) {
          currentId = sections[index].id;
        }
      }

      setActiveSectionId(currentId);
    };

    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", pickByScroll, { passive: true });
      pickByScroll();
      return () => {
        window.removeEventListener("scroll", pickByScroll);
      };
    }

    const visibleSections = new Map();
    const observer = new IntersectionObserver((entries) => {
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (entry.isIntersecting) visibleSections.set(entry.target.id, entry.intersectionRatio);
        else visibleSections.delete(entry.target.id);
      }

      if (!visibleSections.size) {
        pickByScroll();
        return;
      }

      let nextId = "";
      let bestRatio = -1;
      visibleSections.forEach((ratio, id) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          nextId = id;
        }
      });

      if (nextId) setActiveSectionId(nextId);
    }, {
      threshold: [0.2, 0.45, 0.7],
      rootMargin: "-18% 0px -45% 0px"
    });

    for (let index = 0; index < sections.length; index += 1) {
      observer.observe(sections[index]);
    }
    pickByScroll();

    return () => {
      observer.disconnect();
    };
  }, [sectionKey]);

  return activeSectionId;
}
