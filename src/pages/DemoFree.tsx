import { useState, useEffect, useCallback, forwardRef, memo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown, Sparkles, RefreshCw, Loader2, AlertTriangle, Plus, Grid, EyeOff, Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem as RGLLayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { FREE_PROJECT } from '@/config/demo-projects';
import { fetchAllDemoWidgetData } from '@/services/demo-fetch.service';
import AddWidgetDrawer from "@/components/dashboard/AddWidgetDrawer";
import AIPanel from "@/components/dashboard/AIPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Widget, CleanedMetricPayload, WidgetError, Project, LayoutItem as ProjectLayoutItem } from '@/types/models';

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
    <div ref={ref} style={style} className={`${className || ''} glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40 flex flex-col`} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onTouchEnd={onTouchEnd} {...props}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-micro">{title}</p>
        <WidgetActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-3xl font-bold mb-2">{value}</p>
        <span className={`text-xs font-medium ${positive ? 'text-success' : 'text-destructive'}`}>{change} vs last 24h</span>
      </div>
    </div>
  )
));

const ChartCard = memo(forwardRef<HTMLDivElement, { title: string; onEdit: () => void; onDelete: () => void; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>>(
  ({ title, onEdit, onDelete, children, style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => (
    <div ref={ref} style={style} className={`${className || ''} glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40 flex flex-col`} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onTouchEnd={onTouchEnd} {...props}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-micro">{title}</p>
        <WidgetActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="flex-1 min-h-0 w-full">{children}</div>
    </div>
  )
));

const WidgetErrorCard = memo(forwardRef<HTMLDivElement, { error: WidgetError; onEdit: () => void; onDelete: () => void } & React.HTMLAttributes<HTMLDivElement>>(
  ({ error, onEdit, onDelete, style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => (
    <div ref={ref} style={style} className={`${className || ''} glass rounded-xl p-5 card-shadow border-destructive/30 border flex flex-col`} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onTouchEnd={onTouchEnd} {...props}>
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

const DemoFree = () => {
  const [loading, setLoading] = useState(true);
  const [localProject, setLocalProject] = useState<Project>(FREE_PROJECT);
  const [widgetData, setWidgetData] = useState<Map<string, CleanedMetricPayload | WidgetError>>(new Map());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [currentLayout, setCurrentLayout] = useState<Layout>([]);
  const [showGridLines, setShowGridLines] = useState(true);
  
  const { width, containerRef, mounted } = useContainerWidth();

  const loadData = useCallback(async () => {
    try {
      if (localProject.widgets.length > 0) {
        const data = await fetchAllDemoWidgetData(localProject.widgets);
        setWidgetData(data);
        
        const initialLayout: Layout = localProject.widgets.map((w) => {
          const stored = localProject.layout.find((l) => l.widgetId === w.id);
          if (stored) return { i: w.id, ...stored };
          let defaultW = 4;
          let defaultH = 2;
          switch (w.visualization) {
            case 'kpi-card': case 'sparkline': case 'status': case 'gauge':
              defaultW = 2; defaultH = 1; break;
            case 'donut-chart':
              defaultW = 2; defaultH = 3; break;
          }
          return { i: w.id, x: 0, y: Infinity, w: defaultW, h: defaultH };
        });
        setCurrentLayout(initialLayout);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load demo data:', err);
    } finally {
      setLoading(false);
    }
  }, [localProject.widgets.length]);

  useEffect(() => {
    if (loading) {
      loadData();
    }
  }, [loadData, loading]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (localProject.widgets.length > 0) {
        const data = await fetchAllDemoWidgetData(localProject.widgets);
        setWidgetData(data);
      }
      setLastRefreshed(new Date());
    } finally { setRefreshing(false); }
  };

  const onLayoutChange = (layout: Layout) => {
    setCurrentLayout(layout);
    const layoutItems: ProjectLayoutItem[] = layout.map((l) => ({
      widgetId: l.i, x: l.x, y: l.y, w: l.w, h: l.h,
    }));
    setLocalProject(prev => ({ ...prev, layout: layoutItems }));
  };

  const handleDemoSave = (widget: Widget) => {
    setLocalProject(prev => {
      const exists = prev.widgets.findIndex(w => w.id === widget.id);
      let newWidgets;
      if (exists >= 0) {
        newWidgets = [...prev.widgets];
        newWidgets[exists] = widget;
      } else {
        newWidgets = [...prev.widgets, widget];
      }
      return { ...prev, widgets: newWidgets };
    });
    setLoading(true);
  };

  const handleDeleteWidget = (widgetId: string) => {
    if (!window.confirm("Are you sure you want to delete this widget?")) return;
    setLocalProject(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
      layout: prev.layout.filter(l => l.widgetId !== widgetId)
    }));
  };

  const exportToPDF = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    try {
      const A4_W = 210; const A4_H = 297; const MARGIN = 15; const HEADER_H = 18; const FOOTER_H = 10;
      const CONTENT_W = A4_W - MARGIN * 2; const CONTENT_H = A4_H - MARGIN * 2 - HEADER_H - FOOTER_H;

      const grid = containerRef.current.querySelector('.react-grid-layout') as HTMLElement;
      const originalGridBg = grid?.style.backgroundImage;
      const wasGridVisible = showGridLines;

      if (grid) grid.style.backgroundImage = 'none';
      containerRef.current.classList.add('pdf-export-mode');
      setShowGridLines(false);

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(containerRef.current, { scale: 2, backgroundColor: '#09090b', useCORS: true, logging: false });

      containerRef.current.classList.remove('pdf-export-mode');
      if (grid) grid.style.backgroundImage = originalGridBg || '';
      setShowGridLines(wasGridVisible);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidthPx = canvas.width; const imgHeightPx = canvas.height;
      const scale = CONTENT_W / imgWidthPx; const scaledTotalHeight = imgHeightPx * scale;

      const drawPageChrome = (pageNum: number, totalPages: number) => {
        pdf.setFontSize(14); pdf.setTextColor(255, 255, 255); pdf.setFillColor(9, 9, 11);
        pdf.rect(0, 0, A4_W, MARGIN + HEADER_H, 'F');
        pdf.text(`${localProject.emoji} ${localProject.name}`, MARGIN, MARGIN + 10);
        pdf.setFontSize(9); pdf.setTextColor(150, 150, 150);
        pdf.text('PulseGrid Vision — Dashboard Report', A4_W - MARGIN, MARGIN + 10, { align: 'right' });
        pdf.setDrawColor(60, 60, 70); pdf.setLineWidth(0.3);
        pdf.line(MARGIN, MARGIN + HEADER_H, A4_W - MARGIN, MARGIN + HEADER_H);
        pdf.setFontSize(8); pdf.setTextColor(120, 120, 120);
        const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        pdf.text(`Generated on ${now}`, MARGIN, A4_H - MARGIN + 4);
        pdf.text(`Page ${pageNum} / ${totalPages}`, A4_W - MARGIN, A4_H - MARGIN + 4, { align: 'right' });
      };

      const totalPages = Math.max(1, Math.ceil(scaledTotalHeight / CONTENT_H));
      const yStartMM = MARGIN + HEADER_H;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        pdf.setFillColor(9, 9, 11); pdf.rect(0, 0, A4_W, A4_H, 'F');
        drawPageChrome(page + 1, totalPages);
        const sliceYPx = (page * CONTENT_H) / scale;
        const sliceHeightPx = Math.min(CONTENT_H / scale, imgHeightPx - sliceYPx);
        if (sliceHeightPx <= 0) continue;
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidthPx; sliceCanvas.height = Math.ceil(sliceHeightPx);
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(canvas, 0, Math.floor(sliceYPx), imgWidthPx, Math.ceil(sliceHeightPx), 0, 0, imgWidthPx, Math.ceil(sliceHeightPx));
        const sliceImgData = sliceCanvas.toDataURL('image/png');
        const sliceHeightMM = sliceHeightPx * scale;
        pdf.addImage(sliceImgData, 'PNG', MARGIN, yStartMM, CONTENT_W, sliceHeightMM);
      }
      pdf.save(`PulseGrid_${localProject.name.replace(/\s+/g, '_')}_Report.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
    } finally { setIsExporting(false); }
  };

  const timeAgo = () => {
    const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 60000);
    return diff < 1 ? 'just now' : `${diff} min ago`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh]"><Loader2 size={32} className="text-primary animate-spin" /></div>;
  }

  const hasWidgets = localProject.widgets.length > 0;
  const allPayloads: CleanedMetricPayload[] = [];
  widgetData.forEach((val) => { if ('widgetTitle' in val) allPayloads.push(val as CleanedMetricPayload); });

  return (
    <div className="p-8 relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={20} /></Link>
          <span className="text-xl">{localProject.emoji}</span>
          <h1 className="text-xl font-bold">{localProject.name}</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-muted/50 text-muted-foreground rounded-full border border-border">Free Plan</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /><span>Updated {timeAgo()}</span>
          </button>
          <button onClick={exportToPDF} disabled={isExporting || !hasWidgets} className="px-3 py-1.5 border border-border hover:border-primary/50 rounded-lg text-body text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 disabled:opacity-50">
            {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />} {isExporting ? "Exporting..." : "Export PDF"}
          </button>
          <button onClick={() => setShowAI(true)} disabled={!hasWidgets} className="px-3 py-1.5 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent rounded-lg text-body font-medium transition-all flex items-center gap-2 disabled:opacity-50">
            <Sparkles size={14} /> AI Brief
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={() => setShowGridLines(!showGridLines)} className={`p-2 rounded-lg transition-colors border ${showGridLines ? 'bg-muted border-primary/50 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {showGridLines ? <Grid size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>

      {!hasWidgets ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-6">
            <Plus size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No widgets yet</h2>
          <p className="text-muted-foreground text-body max-w-sm mb-8">
            Connect your favorite APIs and start visualizing your data. Your dashboard is ready for your first widget.
          </p>
          <button onClick={() => setShowDrawer(true)} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-95">
            <Plus size={18} /> Add Your First Widget
          </button>
        </div>
      ) : (
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
              {localProject.widgets.map(widget => {
                const data = widgetData.get(widget.id);
                const isError = data && 'code' in data;
                if (isError) return (
                  <div key={widget.id}><WidgetErrorCard className="h-full w-full" error={data as WidgetError} onEdit={() => { setEditingWidget(widget); setShowDrawer(true); }} onDelete={() => handleDeleteWidget(widget.id)} /></div>
                );
                const payload = data as CleanedMetricPayload | undefined;
                if (!payload) return (
                  <div key={widget.id} className="glass rounded-xl p-5 card-shadow flex items-center justify-center"><Loader2 size={20} className="text-muted-foreground animate-spin" /></div>
                );
                return (
                  <div key={widget.id} className="h-full w-full">
                    {renderWidget(widget, payload, () => { setEditingWidget(widget); setShowDrawer(true); }, () => handleDeleteWidget(widget.id))}
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      )}

      <button onClick={() => setShowDrawer(true)} className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center card-shadow pulse-glow transition-transform hover:scale-110 z-30">
        <Plus size={24} />
      </button>

      {showDrawer && (
        <AddWidgetDrawer projectId="demo-free" editingWidget={editingWidget} isDemo={true} onDemoSave={handleDemoSave} onClose={() => { setShowDrawer(false); setEditingWidget(null); }} onWidgetAdded={() => { setShowDrawer(false); setEditingWidget(null); }} />
      )}
      {showAI && <AIPanel projectId="demo-free" widgetPayloads={allPayloads} onClose={() => setShowAI(false)} />}
    </div>
  );
};

function renderWidget(widget: Widget, payload: CleanedMetricPayload, onEdit: () => void, onDelete: () => void) {
  const v = widget.visualization;
  const c = widget.displayOptions.colorPalette || 'hsl(var(--primary))';
  const fmt = (t: number | undefined) => t != null ? `${t > 0 ? '↑' : '↓'} ${Math.abs(t)}%` : '—';
  const chartStyle = { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: 12 };

  if (v !== 'kpi-card' && (!payload.series || payload.series.length === 0)) {
    return <KPICard className="h-full w-full" title={widget.title.toUpperCase()} value={String(payload.primaryValue)} change={fmt(payload.trend)} positive={(payload.trend ?? 0) >= 0} onEdit={onEdit} onDelete={onDelete} />;
  }

  switch (v) {
    case 'kpi-card': case 'sparkline': case 'gauge': case 'status':
      return <KPICard className="h-full w-full" title={widget.title.toUpperCase()} value={String(payload.primaryValue)} change={fmt(payload.trend)} positive={(payload.trend ?? 0) >= 0} onEdit={onEdit} onDelete={onDelete} />;
    case 'bar-chart':
      return <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={onEdit} onDelete={onDelete}><ResponsiveContainer width="100%" height="100%"><BarChart data={payload.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={chartStyle} /><Bar dataKey="value" fill={c} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>;
    case 'line-chart':
      return <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={onEdit} onDelete={onDelete}><ResponsiveContainer width="100%" height="100%"><LineChart data={payload.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={chartStyle} /><Line type="monotone" dataKey="value" stroke={c} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></ChartCard>;
    case 'area-chart':
      return <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={onEdit} onDelete={onDelete}><ResponsiveContainer width="100%" height="100%"><AreaChart data={payload.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id={`g-${widget.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.5} /><stop offset="95%" stopColor={c} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={chartStyle} /><Area type="monotone" dataKey="value" stroke={c} fillOpacity={1} fill={`url(#g-${widget.id})`} /></AreaChart></ResponsiveContainer></ChartCard>;
    case 'donut-chart':
      const colors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
      return <ChartCard className="h-full w-full" title={widget.title.toUpperCase()} onEdit={onEdit} onDelete={onDelete}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={payload.series} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" nameKey="label" label={({ cx, cy, midAngle, outerRadius, percent, name }: any) => { const R = Math.PI / 180; const r = outerRadius * 1.25; return <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)} fill="white" textAnchor={cx + r * Math.cos(-midAngle * R) > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={500}>{name} ({(percent * 100).toFixed(0)}%)</text>; }}>{payload.series?.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip contentStyle={chartStyle} /></PieChart></ResponsiveContainer></ChartCard>;
    default:
      return <KPICard className="h-full w-full" title={widget.title.toUpperCase()} value={String(payload.primaryValue)} change="—" positive={true} onEdit={onEdit} onDelete={onDelete} />;
  }
}

export default DemoFree;
