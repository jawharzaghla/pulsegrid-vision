import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorks from "@/components/landing/HowItWorks";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";
import SalesChatbot from "@/components/landing/SalesChatbot";
import Reveal from "@/components/ui/Reveal";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <Reveal animation="fade-in" duration={800}>
        <HeroSection />
      </Reveal>

      <Reveal animation="slide-up" delay={200}>
        <FeaturesSection />
      </Reveal>

      <Reveal animation="slide-up" delay={200}>
        <HowItWorks />
      </Reveal>

      <Reveal animation="slide-up" delay={200}>
        <PricingSection />
      </Reveal>

      <Reveal animation="fade-in" threshold={0.05}>
        <Footer />
      </Reveal>

      <SalesChatbot />
    </div>
  );
};

export default Index;
