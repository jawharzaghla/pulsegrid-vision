import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PulseGridLogo from "@/components/PulseGridLogo";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? "glass border-b border-border/30" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/">
          <PulseGridLogo />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-body text-muted-foreground hover:text-foreground transition-colors">
            Fonctionnalités
          </a>
          <a href="#pricing" className="text-body text-muted-foreground hover:text-foreground transition-colors">
            Tarifs
          </a>
          <a href="#" className="text-body text-muted-foreground hover:text-foreground transition-colors">
            Docs
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-body text-muted-foreground hover:text-foreground border border-border rounded-lg transition-all hover:border-primary/50"
          >
            Connexion
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-body text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all font-medium"
          >
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
