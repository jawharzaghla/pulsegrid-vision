import { Link } from "react-router-dom";
import dashboardMockup from "@/assets/dashboard-mockup.png";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            One screen. Every business.{" "}
            <span className="gradient-primary-text">Total clarity.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect any REST API. Add a widget. Get AI-powered insight in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all text-body-lg glow-primary text-center"
            >
              Start for Free
            </Link>
            <Link
              to="/app/projects/demo"
              className="w-full sm:w-auto px-8 py-3.5 border border-border hover:border-primary/50 text-foreground font-medium rounded-lg transition-all text-body-lg text-center"
            >
              See it in action
            </Link>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/60 overflow-hidden card-shadow-lg">
            {/* Browser chrome */}
            <div className="bg-secondary/80 px-4 py-3 flex items-center gap-2 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-muted/50 rounded-md px-4 py-1 text-micro text-muted-foreground">
                  app.pulsegrid.io/dashboard
                </div>
              </div>
            </div>
            <img
              src={dashboardMockup}
              alt="PulseGrid Dashboard"
              className="w-full"
            />
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-full text-micro text-accent flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            No backend required
          </div>

          {/* Glow under mockup */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-primary/15 blur-[80px] pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
