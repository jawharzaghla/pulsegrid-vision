import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { getProject, updateProject, updateProjectTheme, deleteProject } from "@/services/firestore.service";
import { useNavigate } from "react-router-dom";
import type { Project, ProjectTheme } from "@/types/models";

const fontSizeOptions = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

const borderOptions = [
  { value: "none", label: "None" },
  { value: "subtle", label: "Subtle" },
  { value: "card", label: "Card" },
  { value: "elevated", label: "Elevated" },
];

const paletteOptions = [
  { value: "default", label: "Default" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "neon", label: "Neon" },
];

const ProjectSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [chartPalette, setChartPalette] = useState("default");
  const [fontSize, setFontSize] = useState<ProjectTheme["fontSize"]>("comfortable");
  const [widgetBorder, setWidgetBorder] = useState<ProjectTheme["widgetBorder"]>("card");

  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      try {
        const proj = await getProject(id);
        if (proj) {
          setProject(proj);
          setName(proj.name);
          setDescription(proj.description);
          setEmoji(proj.emoji);
          setAccentColor(proj.accentColor);
          setChartPalette(proj.theme.chartPalette);
          setFontSize(proj.theme.fontSize);
          setWidgetBorder(proj.theme.widgetBorder);
        }
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateProject(id, { name, description, emoji, accentColor });
      await updateProjectTheme(id, { mode: "dark", chartPalette, fontSize, widgetBorder });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteProject(id);
    navigate("/app/projects", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to={`/app/projects/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      <div className="space-y-8">
        {/* General */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-4">General</h2>
          <div>
            <label className="text-micro block mb-2">PROJECT NAME</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
          </div>
          <div>
            <label className="text-micro block mb-2">DESCRIPTION</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-micro block mb-2">EMOJI</label>
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center text-xl" />
            </div>
            <div>
              <label className="text-micro block mb-2">ACCENT COLOR</label>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-full h-11 bg-muted/50 border border-border rounded-lg cursor-pointer" />
            </div>
          </div>
        </section>

        {/* Theme */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-4">Theme</h2>
          <div>
            <label className="text-micro block mb-2">CHART PALETTE</label>
            <select value={chartPalette} onChange={(e) => setChartPalette(e.target.value)} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
              {paletteOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-micro block mb-2">FONT SIZE</label>
            <select value={fontSize} onChange={(e) => setFontSize(e.target.value as ProjectTheme["fontSize"])} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
              {fontSizeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-micro block mb-2">WIDGET BORDER STYLE</label>
            <select value={widgetBorder} onChange={(e) => setWidgetBorder(e.target.value as ProjectTheme["widgetBorder"])} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
              {borderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </section>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {/* Danger Zone */}
        <section className="border border-destructive/30 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle size={16} /> Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground">Deleting this project will remove all widgets and data permanently.</p>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} className="px-4 py-2 border border-destructive/50 text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-all flex items-center gap-2">
              <Trash2 size={14} /> Delete Project
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={handleDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium">
                Confirm Delete
              </button>
              <button onClick={() => setShowDelete(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all">
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProjectSettings;
