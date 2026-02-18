import { Globe, Brain, GripVertical, ShieldCheck, FolderOpen, RefreshCw } from "lucide-react";

const features = [
  { icon: Globe, title: "Any REST API", desc: "Connect to any endpoint — JSON, GraphQL, or webhooks. We handle the rest." },
  { icon: Brain, title: "AI-Powered Analysis", desc: "Groq + Llama models generate insights, summaries, and anomaly alerts." },
  { icon: GripVertical, title: "Drag & Drop Dashboard", desc: "Build your view with drag-and-drop widgets on a flexible grid canvas." },
  { icon: ShieldCheck, title: "Encrypted Credentials", desc: "API keys and tokens are encrypted at rest with AES-256 security." },
  { icon: FolderOpen, title: "Multi-Project", desc: "Manage multiple businesses, clients, or products from one account." },
  { icon: RefreshCw, title: "Real-time Refresh", desc: "Set custom refresh intervals per widget. Always see live metrics." },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-micro text-accent mb-3">FEATURES</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to see the full picture</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A complete toolkit for connecting, visualizing, and understanding your business data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass rounded-xl p-6 card-shadow transition-all duration-200 hover:border-primary/40 group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <f.icon size={20} className="text-accent" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-body text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
