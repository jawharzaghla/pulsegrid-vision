import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["1 Project", "5 Widgets", "10 AI Analyses / day", "Community Support"],
    cta: "Try Free Demo",
    highlighted: false,
    link: "/demo/free",
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    features: ["10 Projects", "250 Widgets", "100 AI Analyses / day", "Priority Support", "Custom Themes", "Export PDF"],
    cta: "Try Pro Demo",
    highlighted: true,
    link: "/demo/pro",
  },
  {
    name: "Business",
    price: "$49",
    period: "/mo",
    features: ["Unlimited Projects", "Unlimited Widgets", "Unlimited AI Analyses", "Dedicated Support", "SSO & Team Roles", "API Access", "White-label"],
    cta: "Try Business Demo",
    highlighted: false,
    link: "/demo/business",
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-micro text-accent mb-3">PRICING</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground">No hidden fees. Scale as you grow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-xl p-6 transition-all duration-200 ${
                plan.highlighted
                  ? "gradient-border bg-card card-shadow-lg scale-105"
                  : "glass card-shadow hover:border-primary/30"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 gradient-primary rounded-full text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-body">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-body">
                    <Check size={16} className="text-accent shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.link}
                className={`block w-full text-center py-2.5 rounded-lg font-medium text-body transition-all ${
                  plan.highlighted
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "border border-border hover:border-primary/50 text-foreground"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
