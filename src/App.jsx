import AmbientLayers from "./components/layout/AmbientLayers";
import Drawer from "./components/layout/Drawer";
import FloatingCta from "./components/layout/FloatingCta";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import BookingModal from "./components/overlays/BookingModal";
import ContactSection from "./components/sections/ContactSection";
import FaqSection from "./components/sections/FaqSection";
import HeroSection from "./components/sections/HeroSection";
import PortfolioSection from "./components/sections/PortfolioSection";
import PricingSection from "./components/sections/PricingSection";
import ReviewsSection from "./components/sections/ReviewsSection";
import ServicesSection from "./components/sections/ServicesSection";
import TrustSection from "./components/sections/TrustSection";
import Toast from "./components/ui/Toast";
import { useSiteController } from "./hooks/useSiteController";

export default function App() {
  const {
    activeSectionId,
    activeTab,
    bookingRef,
    bookingValues,
    closeBooking,
    closeDrawer,
    closeServices,
    drawerRef,
    dynamicWord,
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
  } = useSiteController();

  return (
    <>
      <AmbientLayers />

      <Header
        activeSectionId={activeSectionId}
        isServicesOpen={isServicesOpen}
        onCloseServices={closeServices}
        onOpenBooking={openBooking}
        onOpenDrawer={openDrawer}
        onToggleServices={toggleServices}
        prefersReducedMotion={prefersReducedMotion}
        servicesRef={servicesRef}
        trackEvent={trackEvent}
      />

      <Drawer
        drawerRef={drawerRef}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onOpenBooking={openBooking}
        prefersReducedMotion={prefersReducedMotion}
        trackEvent={trackEvent}
      />

      <main>
        <HeroSection dynamicWord={dynamicWord} prefersReducedMotion={prefersReducedMotion} trackEvent={trackEvent} />
        <PortfolioSection
          activeTab={activeTab}
          onTabChange={handleTabChange}
          trackEvent={trackEvent}
          unsplashState={unsplashState}
        />
        <TrustSection />
        <ServicesSection />
        <ReviewsSection index={reviewIndex} onSelect={handleReviewSelect} />
        <FaqSection onToggle={handleFaqToggle} />
        <BookingModal
          bookingValues={bookingValues}
          isOpen={isBookingOpen}
          modalRef={bookingRef}
          onApply={handleBookingApply}
          onChange={handleBookingChange}
          onClose={closeBooking}
        />
        <Toast message={toastMessage} />
        <PricingSection expandedPlans={expandedPlans} onTogglePlan={handlePlanToggle} />
        <ContactSection formValues={formValues} onChange={handleFormChange} onSubmit={handleLeadSubmit} pending={leadPending} />
        <Footer trackEvent={trackEvent} />
      </main>

      <FloatingCta prefersReducedMotion={prefersReducedMotion} trackEvent={trackEvent} />
    </>
  );
}
