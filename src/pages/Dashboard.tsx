import { useState, useEffect, useCallback, forwardRef, memo, useRef } from "react";
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
import { UpgradeModal } from "@/components/UpgradeModal";
import { TIER_LIMITS } from "@/types/models";
import type { Project, Widget, CleanedMetricPayload, WidgetError, LayoutItem as ProjectLayoutItem, VisualizationType } from "@/types/models";
import { Grid, EyeOff } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

const KPICard = memo(forwardRef<HTMLDivElement, KPICardProps & React.HTMLAttributes<HTMLDivElement>>(
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
));

// Shared Chart Card Wrapper
const ChartCard = memo(forwardRef<HTMLDivElement, { title: string; onEdit: () => void; onDelete: () => void; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>>(
  ({ title, onEdit, onDelete, children, style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      className={`${className} glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40 flex flex-col`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-micro">{title}</p>
        <WidgetActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="flex-1 min-h-0 w-full">
        {children}
      </div>
    </div>
  )
));

const WidgetErrorCard = memo(forwardRef<HTMLDivElement, { error: WidgetError; onEdit: () => void; onDelete: () => void } & React.HTMLAttributes<HTMLDivElement>>(
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
));

const Dashboard = () => {
  const { id } = useParams();
  const { cryptoKey, tier } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<Map<string, CleanedMetricPayload | WidgetError>>(new Map());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [currentLayout, setCurrentLayout] = useState<Layout>([]);
  const [showGridLines, setShowGridLines] = useState(true);
  const saveLayoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

          // Determine default sizing based on visualization type
          let defaultW = 3;
          let defaultH = 2;
          switch (w.visualization) {
            case 'kpi-card':
            case 'sparkline':
            case 'status':
            case 'gauge':
              defaultW = 2; // Roughly 1x1 block conceptually
              defaultH = 1;
              break;
            case 'bar-chart':
            case 'line-chart':
            case 'area-chart':
              defaultW = 4;
              defaultH = 2;
              break;
            case 'donut-chart':
              defaultW = 2; // User requested 1x2, we use 2x3 as a slim tall layout matching the 12-col grid
              defaultH = 3;
              break;
          }

          // Let react-grid-layout auto-stack new items at the bottom if no explicit coordinates
          return { i: w.id, x: 0, y: Infinity, w: defaultW, h: defaultH };
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

  const handleAddWidget = () => {
    if (!project) return;
    const currentTier = tier || 'free';
    const limit = TIER_LIMITS[currentTier].widgetsPerProject;
    if (project.widgets.length >= limit) {
      setShowUpgradeModal(true);
    } else {
      setShowDrawer(true);
    }
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

    // Debounce Save to Firestore to prevent quota issues on rapid dragging
    if (saveLayoutTimeoutRef.current) {
      clearTimeout(saveLayoutTimeoutRef.current);
    }

    saveLayoutTimeoutRef.current = setTimeout(() => {
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
    }, 1000); // 1-second debounce
  };

  const timeAgo = () => {
    const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 60000);
    if (diff < 1) return "just now";
    return `${diff} min ago`;
  };

  const exportToPDF = async () => {
    if (!containerRef.current || !project) return;
    setIsExporting(true);
    try {
      // A4 dimensions in mm
      const A4_W = 210;
      const A4_H = 297;
      const MARGIN = 15; // mm on each side
      const HEADER_H = 18; // mm reserved for header
      const FOOTER_H = 10; // mm reserved for footer
      const CONTENT_W = A4_W - MARGIN * 2;
      const CONTENT_H = A4_H - MARGIN * 2 - HEADER_H - FOOTER_H;

      // Enter PDF export mode — hides action buttons, drag handles
      const grid = containerRef.current.querySelector('.react-grid-layout') as HTMLElement;
      const originalGridBg = grid?.style.backgroundImage;
      const wasGridVisible = showGridLines;

      if (grid) grid.style.backgroundImage = 'none';
      containerRef.current.classList.add('pdf-export-mode');
      setShowGridLines(false);

      // Wait for React to remove the show-grid class and pdf-export-mode to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: '#09090b',
        useCORS: true,
        logging: false,
      });

      // Restore UI immediately
      containerRef.current.classList.remove('pdf-export-mode');
      if (grid) grid.style.backgroundImage = originalGridBg || '';
      setShowGridLines(wasGridVisible);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Calculate scaling: fit captured width into A4 content area
      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const scale = CONTENT_W / imgWidthPx;
      const scaledTotalHeight = imgHeightPx * scale; // total height in mm

      // Helper to draw header & footer on each page
      const drawPageChrome = (pageNum: number, totalPages: number) => {
        // Header
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.setFillColor(9, 9, 11); // match dark bg
        pdf.rect(0, 0, A4_W, MARGIN + HEADER_H, 'F');
        pdf.text(`${project.emoji} ${project.name}`, MARGIN, MARGIN + 10);
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text('PulseGrid Vision — Dashboard Report', A4_W - MARGIN, MARGIN + 10, { align: 'right' });

        // Horizontal separator
        pdf.setDrawColor(60, 60, 70);
        pdf.setLineWidth(0.3);
        pdf.line(MARGIN, MARGIN + HEADER_H, A4_W - MARGIN, MARGIN + HEADER_H);

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        pdf.text(`Generated on ${now}`, MARGIN, A4_H - MARGIN + 4);
        pdf.text(`Page ${pageNum} / ${totalPages}`, A4_W - MARGIN, A4_H - MARGIN + 4, { align: 'right' });
      };

      // Multi-page: slice the canvas into pages
      const totalPages = Math.max(1, Math.ceil(scaledTotalHeight / CONTENT_H));
      const yStartMM = MARGIN + HEADER_H;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // Fill dark background for entire page
        pdf.setFillColor(9, 9, 11);
        pdf.rect(0, 0, A4_W, A4_H, 'F');

        // Draw page chrome
        drawPageChrome(page + 1, totalPages);

        // Calculate which slice of the source canvas to draw
        const sliceYPx = (page * CONTENT_H) / scale;
        const sliceHeightPx = Math.min(CONTENT_H / scale, imgHeightPx - sliceYPx);

        if (sliceHeightPx <= 0) continue;

        // Create a slice canvas for this page
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidthPx;
        sliceCanvas.height = Math.ceil(sliceHeightPx);
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(
          canvas,
          0, Math.floor(sliceYPx), imgWidthPx, Math.ceil(sliceHeightPx),
          0, 0, imgWidthPx, Math.ceil(sliceHeightPx)
        );

        const sliceImgData = sliceCanvas.toDataURL('image/png');
        const sliceHeightMM = sliceHeightPx * scale;

        pdf.addImage(sliceImgData, 'PNG', MARGIN, yStartMM, CONTENT_W, sliceHeightMM);
      }

      pdf.save(`PulseGrid_${project.name.replace(/\s+/g, '_')}_Report.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
    } finally {
      setIsExporting(false);
    }
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
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="px-3 py-1.5 border border-border hover:border-primary/50 rounded-lg text-body text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />}
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>
          <button onClick={() => setShowAI(true)} className="px-3 py-1.5 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent rounded-lg text-body font-medium transition-all flex items-center gap-2">
            <Sparkles size={14} /> AI Brief
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`p-2 rounded-lg transition-colors border ${showGridLines ? 'bg-muted border-primary/50 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            title="Toggle Grid Lines"
          >
            {showGridLines ? <Grid size={18} /> : <EyeOff size={18} />}
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
            onClick={handleAddWidget}
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
              className={`layout ${showGridLines ? 'show-grid' : ''}`}
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
                        className="h-full w-full"
                        error={data as WidgetError}
                        onEdit={() => handleEditWidget(widget)}
                        onDelete={() => handleDeleteWidget(widget.id)}
                      />
                    </div>
                  );
                }

                const payload = data as CleanedMetricPayload | undefined;
                const vizType = widget.visualization;

                const renderVisualization = () => {
                  if (!payload) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;

                  // KPI fallback if series is missing but chart requested
                  if (vizType !== 'kpi-card' && (!payload.series || payload.series.length === 0)) {
                    return (
                      <KPICard
                        className="h-full w-full"
                        title={widget.title.toUpperCase()}
                        value={String(payload.primaryValue)}
                        change={payload.trend != null ? `${payload.trend > 0 ? "↑" : "↓"} ${Math.abs(payload.trend)}%` : "—"}
                        positive={(payload.trend ?? 0) >= 0}
                        onEdit={() => handleEditWidget(widget)}
                        onDelete={() => handleDeleteWidget(widget.id)}
                      />
                    );
                  }

                  switch (vizType) {
                    case 'kpi-card':
                    case 'sparkline':
                    case 'gauge':
                    case 'status':
                      return (
                        <KPICard
                          className="h-full w-full"
                          title={widget.title.toUpperCase()}
                          value={String(payload.primaryValue)}
                          change={payload.trend != null ? `${payload.trend > 0 ? "↑" : "↓"} ${Math.abs(payload.trend)}%` : "—"}
                          positive={(payload.trend ?? 0) >= 0}
                          onEdit={() => handleEditWidget(widget)}
                          onDelete={() => handleDeleteWidget(widget.id)}
                        />
                      );
                    case 'bar-chart':
                      return (
                        <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={() => handleEditWidget(widget)} onDelete={() => handleDeleteWidget(widget.id)}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={payload.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                              <Bar dataKey="value" fill={widget.displayOptions.colorPalette || 'hsl(var(--primary))'} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      );
                    case 'line-chart':
                      return (
                        <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={() => handleEditWidget(widget)} onDelete={() => handleDeleteWidget(widget.id)}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={payload.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                              <Line type="monotone" dataKey="value" stroke={widget.displayOptions.colorPalette || 'hsl(var(--primary))'} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      );
                    case 'area-chart':
                      return (
                        <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={() => handleEditWidget(widget)} onDelete={() => handleDeleteWidget(widget.id)}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={payload.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`colorValue-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={widget.displayOptions.colorPalette || 'hsl(var(--primary))'} stopOpacity={0.5} />
                                  <stop offset="95%" stopColor={widget.displayOptions.colorPalette || 'hsl(var(--primary))'} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                              <Area type="monotone" dataKey="value" stroke={widget.displayOptions.colorPalette || 'hsl(var(--primary))'} fillOpacity={1} fill={`url(#colorValue-${widget.id})`} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      );
                    case 'donut-chart':
                      return (
                        <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={() => handleEditWidget(widget)} onDelete={() => handleDeleteWidget(widget.id)}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={payload.series}
                                cx="50%"
                                cy="50%"
                                innerRadius={vizType === 'donut-chart' ? 45 : 0}
                                outerRadius={65}
                                paddingAngle={vizType === 'donut-chart' ? 5 : 0}
                                dataKey="value"
                                nameKey="label"
                                labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                                label={({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
                                  const RADIAN = Math.PI / 180;
                                  const radius = outerRadius * 1.25;
                                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                  return (
                                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={500}>
                                      {name} ({(percent * 100).toFixed(0)}%)
                                    </text>
                                  );
                                }}
                              >
                                {payload.series?.map((entry, index) => {
                                  // Fallback palette if specific color isn't provided
                                  const colors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      );
                    default:
                      // Fallback
                      return (
                        <KPICard
                          className="h-full w-full"
                          title={widget.title.toUpperCase()}
                          value={String(payload.primaryValue)}
                          change={payload.trend != null ? `${payload.trend > 0 ? "↑" : "↓"} ${Math.abs(payload.trend)}%` : "—"}
                          positive={(payload.trend ?? 0) >= 0}
                          onEdit={() => handleEditWidget(widget)}
                          onDelete={() => handleDeleteWidget(widget.id)}
                        />
                      );
                  }
                };

                return (
                  <div key={widget.id} className="h-full w-full">
                    {renderVisualization()}
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      )}

      {/* Add Widget FAB */}
      <button
        onClick={handleAddWidget}
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Limite de widgets atteinte"
        description={`Votre plan actuel (${tier || 'free'}) est limité à ${TIER_LIMITS[tier || 'free'].widgetsPerProject} widgets par projet. Passez à un plan supérieur pour en ajouter plus.`}
      />
    </div >
  );
};

export default Dashboard;
