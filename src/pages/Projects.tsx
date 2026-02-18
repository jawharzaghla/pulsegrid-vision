import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, X } from "lucide-react";

const mockProjects = [
  { id: "shopify", name: "Shopify Store", emoji: "🛍️", color: "border-l-primary", desc: "E-commerce analytics", metrics: [{ label: "Revenue", value: "$12.4K" }, { label: "Orders", value: "284" }, { label: "AOV", value: "$43" }], widgets: 12, updated: "2 hours ago" },
  { id: "saas", name: "SaaS App", emoji: "💻", color: "border-l-accent", desc: "Product metrics dashboard", metrics: [{ label: "MRR", value: "$48K" }, { label: "Users", value: "1.2K" }, { label: "Churn", value: "2.3%" }], widgets: 18, updated: "30 min ago" },
  { id: "agency", name: "Marketing Agency", emoji: "📊", color: "border-l-info", desc: "Client campaign tracking", metrics: [{ label: "Spend", value: "$8.2K" }, { label: "ROAS", value: "4.2x" }, { label: "Leads", value: "342" }], widgets: 9, updated: "1 day ago" },
  { id: "realestate", name: "Real Estate Portfolio", emoji: "🏠", color: "border-l-warning", desc: "Property performance", metrics: [{ label: "Value", value: "$2.1M" }, { label: "Units", value: "24" }, { label: "Occ.", value: "94%" }], widgets: 7, updated: "3 hours ago" },
];

const emojis = ["📊", "💻", "🛍️", "🏠", "🚀", "📈", "💰", "🎯", "⚡", "🌍", "📱", "🔥", "✨", "🎨", "🧠", "📦", "🏢", "🛠️", "📡", "💎"];
const accentColors = ["bg-primary", "bg-accent", "bg-info", "bg-warning", "bg-success", "bg-destructive", "bg-purple-400", "bg-pink-400"];

const Projects = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search projects..." className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 transition-all" />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all text-body">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <Link
            key={project.id}
            to={`/app/projects/${project.id}`}
            className={`group glass rounded-xl p-5 card-shadow border-l-2 ${project.color} transition-all hover:border-primary/40 hover:scale-[1.02]`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                {project.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{project.name}</h3>
                <p className="text-body text-muted-foreground truncate">{project.desc}</p>
              </div>
            </div>

            <div className="flex gap-4 mb-4">
              {project.metrics.map((m, i) => (
                <div key={i}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{project.updated}</span>
              <span className="px-2 py-0.5 bg-muted/50 rounded-full">{project.widgets} widgets</span>
            </div>
          </Link>
        ))}

        {/* Empty state card */}
        <button
          onClick={() => setShowModal(true)}
          className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all min-h-[200px]"
        >
          <Plus size={24} />
          <span className="text-body font-medium">Add your first project</span>
        </button>
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-strong rounded-2xl p-8 w-full max-w-md card-shadow-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="text-micro block mb-2">PROJECT NAME</label>
                <input placeholder="My Dashboard" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-micro block mb-2">DESCRIPTION</label>
                <textarea placeholder="What's this project for?" rows={2} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none" />
              </div>
              <div>
                <label className="text-micro block mb-2">EMOJI</label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map((e, i) => (
                    <button key={i} type="button" className="w-9 h-9 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-lg transition-all hover:scale-110">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-micro block mb-2">ACCENT COLOR</label>
                <div className="flex gap-2">
                  {accentColors.map((c, i) => (
                    <button key={i} type="button" className={`w-8 h-8 rounded-full ${c} transition-all hover:scale-110 hover:ring-2 ring-foreground/30`} />
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all mt-4">
                Create Project
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="w-full text-center text-body text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
