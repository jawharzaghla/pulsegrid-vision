import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

const emojis = ["📊", "💻", "🛍️", "🏠", "🚀", "📈", "💰", "🎯", "⚡", "🌍"];
const accentColors = ["bg-primary", "bg-accent", "bg-info", "bg-warning", "bg-success", "bg-destructive", "bg-purple-400", "bg-pink-400"];
const tabs = ["General", "Widgets", "Theme", "Danger Zone"];

const palettes = [
  ["#7B2FBE", "#9B59B6", "#00C9A7", "#3498DB", "#2ECC71", "#F1C40F"],
  ["#E74C3C", "#E67E22", "#F1C40F", "#2ECC71", "#3498DB", "#9B59B6"],
  ["#1ABC9C", "#3498DB", "#9B59B6", "#E74C3C", "#E67E22", "#F1C40F"],
  ["#2C3E50", "#7F8C8D", "#BDC3C7", "#ECF0F1", "#95A5A6", "#34495E"],
  ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DFE6E9"],
  ["#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#00B894", "#55E6C1"],
];

const ProjectSettings = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link to={`/app/projects/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      <div className="flex gap-8">
        {/* Sub nav */}
        <div className="w-48 shrink-0 space-y-1">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-body transition-all ${
                i === activeTab ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              } ${i === 3 ? "text-destructive" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-micro block mb-2">PROJECT NAME</label>
                <input defaultValue="SaaS App" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-micro block mb-2">DESCRIPTION</label>
                <textarea defaultValue="Product metrics dashboard" rows={3} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none" />
              </div>
              <div>
                <label className="text-micro block mb-2">EMOJI</label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map((e, i) => (
                    <button key={i} className="w-9 h-9 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-lg transition-all hover:scale-110">{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-micro block mb-2">ACCENT COLOR</label>
                <div className="flex gap-2">
                  {accentColors.map((c, i) => (
                    <button key={i} className={`w-8 h-8 rounded-full ${c} transition-all hover:scale-110 hover:ring-2 ring-foreground/30`} />
                  ))}
                </div>
              </div>
              <button className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all">Save Changes</button>
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-6">
              <div>
                <label className="text-micro block mb-3">CHART PALETTE</label>
                <div className="grid grid-cols-3 gap-3">
                  {palettes.map((p, i) => (
                    <button key={i} className="flex gap-0.5 p-3 rounded-xl border border-border bg-muted/20 hover:border-primary/50 transition-all">
                      {p.map((c, j) => (
                        <div key={j} className="flex-1 h-6 rounded-sm" style={{ background: c }} />
                      ))}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-micro block mb-3">FONT SIZE</label>
                <div className="flex gap-3">
                  {["Compact", "Comfortable", "Spacious"].map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 text-body cursor-pointer">
                      <input type="radio" name="fontsize" defaultChecked={i === 1} className="accent-primary" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-micro block mb-3">WIDGET BORDER STYLE</label>
                <div className="grid grid-cols-4 gap-3">
                  {["None", "Subtle", "Card", "Elevated"].map((style, i) => (
                    <button key={i} className={`p-4 rounded-xl border text-body text-center transition-all ${
                      i === 2 ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/40"
                    }`}>
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="glass rounded-xl p-6 border-destructive/30 border">
              <h3 className="font-semibold text-destructive mb-2">Delete Project</h3>
              <p className="text-body text-muted-foreground mb-4">
                This action cannot be undone. All widgets, data mappings, and AI analyses will be permanently removed.
              </p>
              <button className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-lg transition-all">
                Delete Project
              </button>
            </div>
          )}

          {activeTab === 1 && (
            <p className="text-muted-foreground text-body">Widget management and ordering will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSettings;
