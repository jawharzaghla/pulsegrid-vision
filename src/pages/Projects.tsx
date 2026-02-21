import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProjects, createProject, deleteProject } from "@/services/firestore.service";
import type { Project } from "@/types/models";

const emojis = ["📊", "💻", "🛍️", "🏠", "🚀", "📈", "💰", "🎯", "⚡", "🌍", "📱", "🔥", "✨", "🎨", "🧠", "📦", "🏢", "🛠️", "📡", "💎"];
const accentColors = [
  { className: "bg-primary", value: "#7B2FBE" },
  { className: "bg-accent", value: "#00C9A7" },
  { className: "bg-info", value: "#3498DB" },
  { className: "bg-warning", value: "#F59E0B" },
  { className: "bg-success", value: "#22C55E" },
  { className: "bg-destructive", value: "#EF4444" },
  { className: "bg-purple-400", value: "#A855F7" },
  { className: "bg-pink-400", value: "#F472B6" },
];

const borderColorMap: Record<string, string> = {
  "#7B2FBE": "border-l-primary",
  "#00C9A7": "border-l-accent",
  "#3498DB": "border-l-info",
  "#F59E0B": "border-l-warning",
  "#22C55E": "border-l-success",
  "#EF4444": "border-l-destructive",
  "#A855F7": "border-l-purple-400",
  "#F472B6": "border-l-pink-400",
};

const Projects = () => {
  const { firebaseUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New project form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEmoji, setNewEmoji] = useState("📊");
  const [newColor, setNewColor] = useState("#7B2FBE");
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const data = await getUserProjects(firebaseUser.uid);
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [firebaseUser]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !newName) return;
    try {
      setCreating(true);
      await createProject(firebaseUser.uid, {
        name: newName,
        description: newDesc,
        emoji: newEmoji,
        accentColor: newColor,
      });
      setShowModal(false);
      setNewName("");
      setNewDesc("");
      setNewEmoji("📊");
      setNewColor("#7B2FBE");
      await loadProjects();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div className="p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 transition-all"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all text-body">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-body mb-4">No projects yet. Create your first one!</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all text-body"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              to={`/app/projects/${project.id}`}
              className={`group glass rounded-xl p-5 card-shadow border-l-2 ${borderColorMap[project.accentColor] || "border-l-primary"} transition-all hover:border-primary/40 hover:scale-[1.02]`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  {project.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{project.name}</h3>
                  <p className="text-body text-muted-foreground truncate">{project.description || "No description"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{getTimeAgo(project.updatedAt)}</span>
                <span className="px-2 py-0.5 bg-muted/50 rounded-full">{project.widgets.length} widgets</span>
              </div>
            </Link>
          ))}

          {/* Add project card */}
          <button
            onClick={() => setShowModal(true)}
            className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all min-h-[200px]"
          >
            <Plus size={24} />
            <span className="text-body font-medium">Add a project</span>
          </button>
        </div>
      )}

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

            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="text-micro block mb-2">PROJECT NAME</label>
                <input
                  placeholder="My Dashboard"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-micro block mb-2">DESCRIPTION</label>
                <textarea
                  placeholder="What's this project for?"
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-micro block mb-2">EMOJI</label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map((e, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewEmoji(e)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110 ${newEmoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted/50 hover:bg-muted"
                        }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-micro block mb-2">ACCENT COLOR</label>
                <div className="flex gap-2">
                  {accentColors.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewColor(c.value)}
                      className={`w-8 h-8 rounded-full ${c.className} transition-all hover:scale-110 ${newColor === c.value ? "ring-2 ring-foreground/50 scale-110" : ""
                        }`}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={creating || !newName}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create Project"}
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
