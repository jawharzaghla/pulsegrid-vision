import { useState, useEffect, useCallback, forwardRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Settings, FileDown, Sparkles, MoreHorizontal, Plus, RefreshCw, Loader2, AlertTriangle, Trash2, Edit3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem as RGLLayoutItem } from "react-grid-layout";
import AddWidgetDrawer from "@/components/dashboard/AddWidgetDrawer";
import AIPanel from "@/components/dashboard/AIPanel";
import { getProject, saveLayout, deleteWidget } from "@/services/firestore.service";
import { fetchAllWidgetData } from "@/services/api-fetch.service";
import { useAuth } from "@/contexts/AuthContext";
import type { Project, Widget, CleanedMetricPayload, WidgetError, LayoutItem as ProjectLayoutItem } from "@/types/models";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WidgetActionProps {
  onEdit: () => void;
  onDelete: () => void;
}

const WidgetActions = ({ onEdit, onDelete }: WidgetActionProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="p-1 hover:bg-muted rounded-md transition-colors">
        <MoreHorizontal size={14} className="text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-40 glass border-border shadow-xl">
      <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
        <Edit3 size={14} />
        <span>Edit Widget</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onDelete} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
        <Trash2 size={14} />
        <span>Delete Widget</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const KPICard = forwardRef<HTMLDivElement, KPICardProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ title, value, change, positive, onEdit, onDelete, style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      className={`${className} glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40 flex flex-col`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-micro">{title}</p>
        <WidgetActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-3xl font-bold mb-2">{value}</p>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>{change} vs last month</span>
        </div>
      </div>
    </div>
  )
);

const WidgetErrorCard = forwardRef<HTMLDivElement, { error: WidgetError; onEdit: () => void; onDelete: () => void } & React.HTMLAttributes<HTMLDivElement>>(
  ({ error, onEdit, onDelete, style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      className={`${className} glass rounded-xl p-5 card-shadow border-destructive/30 border flex flex-col`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-destructive" />
          <p className="text-sm font-medium text-destructive">Widget Error</p>
        </div>
        <WidgetActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <p className="text-xs text-muted-foreground flex-1 overflow-auto">{error.message}</p>
    </div>
  )
);

const Dashboard = () => {
  const { id } = useParams();
  const { cryptoKey } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<Map<string, CleanedMetricPayload | WidgetError>>(new Map());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [currentLayout, setCurrentLayout] = useState<Layout>([]);

  const { width, containerRef, mounted } = useContainerWidth();

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const proj = await getProject(id);
      setProject(proj);

      // Fetch widget data if any widgets exist
      if (proj && proj.widgets.length > 0) {
        const data = await fetchAllWidgetData(proj.widgets, cryptoKey);
        setWidgetData(data);

        // Map initial layout or use stored layout
        const initialLayout: Layout = proj.widgets.map((w, i) => {
          const stored = proj.layout.find((l) => l.widgetId === w.id);
          if (stored) return { i: w.id, ...stored };
          // Default layout: 3x2 grid items
          return { i: w.id, x: (i % 4) * 3, y: Math.floor(i / 4) * 2, w: 3, h: 2 };
        });
        setCurrentLayout(initialLayout);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoading(false);
    }
  }, [id, cryptoKey]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleRefresh = async () => {
    if (!project || refreshing) return;
    setRefreshing(true);
    try {
      if (project.widgets.length > 0) {
        const data = await fetchAllWidgetData(project.widgets, cryptoKey);
        setWidgetData(data);
      }
      setLastRefreshed(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const onWidgetAdded = () => {
    setShowDrawer(false);
    setEditingWidget(null);
    loadProject();
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowDrawer(true);
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!id || !window.confirm("Are you sure you want to delete this widget?")) return;
    try {
      await deleteWidget(id, widgetId);
      loadProject();
    } catch (err) {
      console.error("Failed to delete widget:", err);
    }
  };

  const onLayoutChange = (layout: Layout) => {
    if (!id || !project) return;
    setCurrentLayout(layout);

    // Save to Firestore
    const layoutItems: ProjectLayoutItem[] = layout.map((l) => ({
      widgetId: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
    }));

    saveLayout(id, layoutItems).catch((err) => {
      console.error("Failed to save layout:", err);
    });
  };

  const timeAgo = () => {
    const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 60000);
    if (diff < 1) return "just now";
    return `${diff} min ago`;
  };

  // Collect all successful widget payloads for AI panel
  const allPayloads: CleanedMetricPayload[] = [];
  widgetData.forEach((val) => {
    if ('widgetTitle' in val) allPayloads.push(val);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  const projectName = project?.name || "Dashboard";
  const projectEmoji = project?.emoji || "⚡";
  const hasWidgets = project && project.widgets.length > 0;

  return (
    <div className="p-8 relative">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/app/projects" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">{projectEmoji}</span>
            <h1 className="text-xl font-bold">{projectName}</h1>
            <span className="w-3 h-3 rounded-full bg-primary" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            <span>Updated {timeAgo()}</span>
          </button>
          <Link to={`/app/projects/${id}/settings`} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Settings size={18} />
          </Link>
          <button className="px-3 py-1.5 border border-border hover:border-primary/50 rounded-lg text-body text-muted-foreground hover:text-foreground transition-all flex items-center gap-2">
            <FileDown size={14} /> Export PDF
          </button>
          <button onClick={() => setShowAI(true)} className="px-3 py-1.5 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent rounded-lg text-body font-medium transition-all flex items-center gap-2">
            <Sparkles size={14} /> AI Brief
          </button>
        </div>
      </div>

      {/* Show demo data when no widgets, or live data when widgets exist */}
      {!hasWidgets ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-6">
            <Plus size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No widgets yet</h2>
          <p className="text-muted-foreground text-body max-w-sm mb-8">
            Connect your favorite APIs and start visualizing your data. Your dashboard is ready for your first widget.
          </p>
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-95"
          >
            <Plus size={18} /> Add Your First Widget
          </button>
        </div>
      ) : (
        /* Live grid layout */
        <div ref={containerRef}>
          {mounted && (
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: currentLayout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={100}
              width={width}
              {...({ draggableHandle: ".text-micro" } as any)}
              onLayoutChange={onLayoutChange}
            >
              {project!.widgets.map((widget) => {
                const data = widgetData.get(widget.id);
                const isError = data && 'code' in data;

                if (isError) {
                  return (
                    <div key={widget.id}>
                      <WidgetErrorCard
                        error={data as WidgetError}
                        onEdit={() => handleEditWidget(widget)}
                        onDelete={() => handleDeleteWidget(widget.id)}
                      />
                    </div>
                  );
                }

                const payload = data as CleanedMetricPayload | undefined;
                return (
                  <div key={widget.id}>
                    <KPICard
                      title={widget.title.toUpperCase()}
                      value={payload ? String(payload.primaryValue) : "Loading..."}
                      change={payload?.trend != null ? `${payload.trend > 0 ? "↑" : "↓"} ${payload.trend}%` : "—"}
                      positive={(payload?.trend ?? 0) >= 0}
                      onEdit={() => handleEditWidget(widget)}
                      onDelete={() => handleDeleteWidget(widget.id)}
                    />
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      )}

      {/* Add Widget FAB */}
      <button
        onClick={() => setShowDrawer(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center card-shadow pulse-glow transition-transform hover:scale-110 z-30"
      >
        <Plus size={24} />
      </button>

      {/* Drawers */}
      {
        showDrawer && (
          <AddWidgetDrawer
            projectId={id || ""}
            editingWidget={editingWidget}
            onClose={() => {
              setShowDrawer(false);
              setEditingWidget(null);
            }}
            onWidgetAdded={onWidgetAdded}
          />
        )
      }
      {showAI && <AIPanel projectId={id || ""} widgetPayloads={allPayloads} onClose={() => setShowAI(false)} />}
    </div >
  );
};

export default Dashboard;
