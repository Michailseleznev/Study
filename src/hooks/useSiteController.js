import { useEffect, useRef, useState } from "react";
import { portfolioTabs, reviews } from "../data/siteContent";
import { useActiveSection } from "./useActiveSection";
import { useAnalytics } from "./useAnalytics";
import { useFocusTrap } from "./useFocusTrap";
import { usePortfolioGlow } from "./usePortfolioGlow";
import { useReducedMotion } from "./useReducedMotion";
import { useUnsplashGallery } from "./useUnsplashGallery";
import { useVisualRuntime } from "./useVisualRuntime";

const HERO_WORDS = ["портреты", "студия", "креатив", "сток", "природа"];
const ACTIVE_SECTION_IDS = ["portfolio", "services", "reviews", "faq", "pricing", "contact"];

const INITIAL_BOOKING_VALUES = {
  date: "",
  time: "не важно",
  type: "Портрет"
};

const INITIAL_FORM_VALUES = {
  name: "",
  contact: "",
  comment: ""
};

function isTouchHoverDevice() {
  return Boolean(window.matchMedia && window.matchMedia("(hover: hover)").matches);
}

export function useSiteController() {
  const prefersReducedMotion = useReducedMotion();
  const { trackEvent } = useAnalytics();

  const [activeTab, setActiveTab] = useState(portfolioTabs[0].id);
  const [dynamicWordIndex, setDynamicWordIndex] = useState(0);
  const [isServicesOpen, setServicesOpen] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isBookingOpen, setBookingOpen] = useState(false);
  const [bookingValues, setBookingValues] = useState(INITIAL_BOOKING_VALUES);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [expandedPlans, setExpandedPlans] = useState({});
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [leadPending, setLeadPending] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const drawerRef = useRef(null);
  const bookingRef = useRef(null);
  const servicesRef = useRef(null);

  const activeSectionId = useActiveSection(ACTIVE_SECTION_IDS);
  const unsplashState = useUnsplashGallery({
    active: activeTab === "tab-unsplash",
    trackEvent
  });

  usePortfolioGlow(activeTab, unsplashState.items.length);
  useVisualRuntime({
    activeTab,
    contentVersion: unsplashState.items.length,
    prefersReducedMotion
  });

  useFocusTrap(drawerRef, isDrawerOpen);
  useFocusTrap(bookingRef, isBookingOpen);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const intervalId = window.setInterval(() => {
      setDynamicWordIndex((current) => (current + 1) % HERO_WORDS.length);
    }, 2400);

    return () => {
      clearInterval(intervalId);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const intervalId = window.setInterval(() => {
      setReviewIndex((current) => (current + 1) % reviews.length);
    }, 5200);

    return () => {
      clearInterval(intervalId);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  useEffect(() => {
    document.body.style.overflow = (isDrawerOpen || isBookingOpen) ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isBookingOpen, isDrawerOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isServicesOpen) return;
      if (!servicesRef.current?.contains(event.target)) {
        setServicesOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isServicesOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (isBookingOpen) {
        setBookingOpen(false);
        return;
      }
      if (isDrawerOpen) {
        setDrawerOpen(false);
        return;
      }
      if (isServicesOpen) {
        setServicesOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isBookingOpen, isDrawerOpen, isServicesOpen]);

  useEffect(() => {
    if (!isBookingOpen) return undefined;

    const timeoutId = window.setTimeout(() => {
      document.getElementById("bDate")?.focus();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isBookingOpen]);

  const showToast = (message) => {
    setToastMessage(message);
  };

  const closeServices = () => {
    setServicesOpen(false);
  };

  const toggleServices = () => {
    setServicesOpen((current) => {
      const next = !current;
      trackEvent("services_dropdown", { open: next });
      return next;
    });
  };

  const openDrawer = () => {
    setServicesOpen(false);
    setDrawerOpen(true);
    trackEvent("drawer_toggle", { open: true });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    trackEvent("drawer_toggle", { open: false });
  };

  const openBooking = (source) => {
    setServicesOpen(false);
    setDrawerOpen(false);
    setBookingOpen(true);
    trackEvent("booking_modal_open", { source });
  };

  const closeBooking = () => {
    setBookingOpen(false);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    trackEvent("portfolio_tab_change", { tabId });
  };

  const handleBookingChange = (field, value) => {
    setBookingValues((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleBookingApply = () => {
    const date = bookingValues.date || "без даты";
    const time = bookingValues.time || "не важно";
    const type = bookingValues.type || "съёмка";
    const chunk = `Хочу: ${type}. Дата: ${date}. Время: ${time}.`;

    setFormValues((current) => ({
      ...current,
      comment: current.comment ? `${chunk}\n${current.comment}` : chunk
    }));
    setBookingOpen(false);
    document.querySelector("#contact")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });
    showToast("Готово: дата добавлена в форму ниже.");
    trackEvent("booking_modal_apply", { type, date, time });
  };

  const handlePlanToggle = (planTitle, force = false) => {
    if (!force && isTouchHoverDevice()) return;

    setExpandedPlans((current) => {
      const next = {
        ...current,
        [planTitle]: !current[planTitle]
      };
      trackEvent("pricing_expand", { expanded: Boolean(next[planTitle]), plan: planTitle });
      return next;
    });
  };

  const handleFormChange = (field, value) => {
    setFormValues((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleReviewSelect = (index) => {
    setReviewIndex(index);
    trackEvent("review_dot_click", { index });
  };

  const handleFaqToggle = (question, open) => {
    trackEvent("faq_toggle", { question, open });
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();

    const name = String(formValues.name || "").trim();
    const contact = String(formValues.contact || "").trim();
    const comment = String(formValues.comment || "").trim();

    if (!name || !contact) {
      showToast("Укажи имя и контакт (Telegram/телефон), пожалуйста.");
      return;
    }

    const payload = {
      name,
      contact,
      comment,
      source: "site_form",
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };

    setLeadPending(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ ok: false }));
        throw new Error(errorPayload.error || "lead_submit_failed");
      }

      const result = await response.json().catch(() => ({}));
      const telegramSent = !result || result.telegram_sent !== false;
      const telegramStatus = result?.telegram_status ? String(result.telegram_status) : "";

      if (telegramSent) {
        showToast("Заявка отправлена. Я свяжусь с вами в ближайшее время.");
        trackEvent("lead_submit_success", { source: "site_form" });
      } else {
        showToast("Заявка сохранена, но Telegram недоступен. Напишите: @Mihmihfoto0312");
        trackEvent("lead_submit_partial", { source: "site_form", telegram_status: telegramStatus || "unknown" });
        console.warn("[lead] telegram not sent", telegramStatus || "unknown");
      }

      setFormValues(INITIAL_FORM_VALUES);
    } catch (error) {
      console.error("[lead] submit failed", error);
      showToast("Не удалось отправить заявку. Напишите в Telegram: @Mihmihfoto0312");
      trackEvent("lead_submit_failed", { reason: String(error?.message || "unknown") });
    } finally {
      setLeadPending(false);
    }
  };

  return {
    activeSectionId,
    activeTab,
    bookingRef,
    bookingValues,
    closeBooking,
    closeDrawer,
    closeServices,
    drawerRef,
    dynamicWord: HERO_WORDS[dynamicWordIndex],
    expandedPlans,
    formValues,
    handleBookingApply,
    handleBookingChange,
    handleFaqToggle,
    handleFormChange,
    handleLeadSubmit,
    handlePlanToggle,
    handleReviewSelect,
    handleTabChange,
    isBookingOpen,
    isDrawerOpen,
    isServicesOpen,
    leadPending,
    openBooking,
    openDrawer,
    prefersReducedMotion,
    reviewIndex,
    servicesRef,
    toastMessage,
    toggleServices,
    trackEvent,
    unsplashState
  };
}
