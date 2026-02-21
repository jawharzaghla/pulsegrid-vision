import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Settings, FileDown, Sparkles, MoreHorizontal, Plus, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import AddWidgetDrawer from "@/components/dashboard/AddWidgetDrawer";
import AIPanel from "@/components/dashboard/AIPanel";
import { getProject } from "@/services/firestore.service";
import { fetchAllWidgetData } from "@/services/api-fetch.service";
import type { Project, Widget, CleanedMetricPayload, WidgetError } from "@/types/models";

const COLORS = ["hsl(270,61%,47%)", "hsl(270,50%,55%)", "hsl(200,80%,50%)", "hsl(170,100%,39%)"];
const sparkline = [12, 15, 13, 18, 16, 20, 22, 19, 24, 21, 25, 28];

// Static demo data for projects without widgets yet
const demoKPIs = [
  { title: "MONTHLY REVENUE", value: "$48,290", change: "↑ +12.4%", positive: true },
  { title: "ACTIVE USERS", value: "1,204", change: "↑ +8.1%", positive: true },
  { title: "CHURN RATE", value: "2.3%", change: "↓ -0.4%", positive: true },
  { title: "MRR GROWTH", value: "$3,840", change: "↑ +5.2%", positive: true },
];

const demoRevenueData = [
  { month: "Jan", value: 32000 }, { month: "Feb", value: 35000 }, { month: "Mar", value: 33000 },
  { month: "Apr", value: 38000 }, { month: "May", value: 42000 }, { month: "Jun", value: 40000 },
  { month: "Jul", value: 45000 }, { month: "Aug", value: 43000 }, { month: "Sep", value: 47000 },
  { month: "Oct", value: 44000 }, { month: "Nov", value: 46000 }, { month: "Dec", value: 48290 },
];

const demoUsersData = [
  { source: "Organic", value: 420 }, { source: "Paid", value: 310 },
  { source: "Referral", value: 180 }, { source: "Direct", value: 150 },
  { source: "Social", value: 94 }, { source: "Email", value: 50 },
];

const demoRevenueBreakdown = [
  { name: "Subscriptions", value: 60 }, { name: "One-time", value: 20 },
  { name: "Add-ons", value: 12 }, { name: "Enterprise", value: 8 },
];

const demoTopProducts = [
  { name: "Pro Plan", revenue: "$18,420", growth: "+14.2%" },
  { name: "Business Plan", revenue: "$12,300", growth: "+8.1%" },
  { name: "API Add-on", revenue: "$8,940", growth: "+22.7%" },
  { name: "Storage Pack", revenue: "$5,210", growth: "+5.3%" },
  { name: "Support Tier", revenue: "$3,420", growth: "+11.0%" },
];

const KPICard = ({ title, value, change, positive }: { title: string; value: string; change: string; positive: boolean }) => (
  <div className="glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40">
    <div className="flex items-center justify-between mb-1">
      <p className="text-micro">{title}</p>
      <MoreHorizontal size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <p className="text-3xl font-bold mb-2">{value}</p>
    <div className="flex items-center justify-between">
      <span className={`text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>{change} vs last month</span>
      <div className="flex items-end gap-[2px] h-4">
        {sparkline.map((v, i) => (
          <div key={i} className="w-[3px] bg-primary/40 rounded-t-sm" style={{ height: `${(v / 28) * 100}%` }} />
        ))}
      </div>
    </div>
  </div>
);

const WidgetErrorCard = ({ error }: { error: WidgetError }) => (
  <div className="glass rounded-xl p-5 card-shadow border-destructive/30 border">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle size={16} className="text-destructive" />
      <p className="text-sm font-medium text-destructive">Widget Error</p>
    </div>
    <p className="text-xs text-muted-foreground">{error.message}</p>
  </div>
);

const Dashboard = () => {
  const { id } = useParams();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<Map<string, CleanedMetricPayload | WidgetError>>(new Map());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const proj = await getProject(id);
      setProject(proj);

      // Fetch widget data if any widgets exist
      if (proj && proj.widgets.length > 0) {
        const data = await fetchAllWidgetData(proj.widgets, null);
        setWidgetData(data);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleRefresh = async () => {
    if (!project || refreshing) return;
    setRefreshing(true);
    try {
      if (project.widgets.length > 0) {
        const data = await fetchAllWidgetData(project.widgets, null);
        setWidgetData(data);
      }
      setLastRefreshed(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const onWidgetAdded = () => {
    setShowDrawer(false);
    loadProject();
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
        <>
          {/* Demo dashboard with static data */}
          <div className="grid grid-cols-12 gap-4">
            {demoKPIs.map((kpi, i) => (
              <div key={i} className="col-span-3"><KPICard {...kpi} /></div>
            ))}

            <div className="col-span-6 glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40">
              <div className="flex items-center justify-between mb-4">
                <p className="text-micro">REVENUE OVER TIME</p>
                <MoreHorizontal size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={demoRevenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(270,61%,47%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(170,100%,39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,25%,22%)" />
                  <XAxis dataKey="month" stroke="hsl(220,9%,46%)" fontSize={11} />
                  <YAxis stroke="hsl(220,9%,46%)" fontSize={11} tickFormatter={(v) => `$${v / 1000}K`} />
                  <Tooltip contentStyle={{ background: "hsl(240,27%,14%)", border: "1px solid hsl(240,25%,22%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(270,61%,47%)" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="col-span-6 glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40">
              <div className="flex items-center justify-between mb-4">
                <p className="text-micro">USERS BY SOURCE</p>
                <MoreHorizontal size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={demoUsersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,25%,22%)" />
                  <XAxis dataKey="source" stroke="hsl(220,9%,46%)" fontSize={11} />
                  <YAxis stroke="hsl(220,9%,46%)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(240,27%,14%)", border: "1px solid hsl(240,25%,22%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="value" fill="hsl(270,61%,47%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="col-span-4 glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40">
              <div className="flex items-center justify-between mb-4">
                <p className="text-micro">REVENUE SPLIT</p>
              </div>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={demoRevenueBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {demoRevenueBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {demoRevenueBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-body">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-4 glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40">
              <div className="flex items-center justify-between mb-4">
                <p className="text-micro">TOP 5 PRODUCTS</p>
              </div>
              <table className="w-full text-body">
                <thead>
                  <tr className="text-micro text-left">
                    <th className="pb-2">NAME</th>
                    <th className="pb-2">REVENUE</th>
                    <th className="pb-2 text-right">GROWTH</th>
                  </tr>
                </thead>
                <tbody>
                  {demoTopProducts.map((p, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                      <td className="py-2 px-1 rounded-l-md">{p.name}</td>
                      <td className="py-2">{p.revenue}</td>
                      <td className="py-2 px-1 text-right text-success rounded-r-md">{p.growth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="col-span-4 glass rounded-xl p-5 card-shadow group transition-all hover:border-primary/40">
              <div className="flex items-center justify-between mb-4">
                <p className="text-micro">CONVERSION FUNNEL</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Visitors", value: 12400, pct: 100 },
                  { label: "Signups", value: 2480, pct: 20 },
                  { label: "Active", value: 1204, pct: 9.7 },
                  { label: "Paying", value: 482, pct: 3.9 },
                ].map((step, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{step.label}</span>
                      <span className="font-medium">{step.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${step.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hint to add widgets */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">This is demo data. Add widgets to connect your own APIs.</p>
          </div>
        </>
      ) : (
        /* Live widget data */
        <div className="grid grid-cols-12 gap-4">
          {project!.widgets.map((widget) => {
            const data = widgetData.get(widget.id);
            const isError = data && 'code' in data;

            if (isError) {
              return (
                <div key={widget.id} className="col-span-3">
                  <WidgetErrorCard error={data as WidgetError} />
                </div>
              );
            }

            const payload = data as CleanedMetricPayload | undefined;
            return (
              <div key={widget.id} className="col-span-3">
                <KPICard
                  title={widget.title.toUpperCase()}
                  value={payload ? String(payload.primaryValue) : "Loading..."}
                  change={payload?.trend != null ? `${payload.trend > 0 ? "↑" : "↓"} ${payload.trend}%` : "—"}
                  positive={(payload?.trend ?? 0) >= 0}
                />
              </div>
            );
          })}
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
      {showDrawer && <AddWidgetDrawer projectId={id || ""} onClose={() => setShowDrawer(false)} onWidgetAdded={onWidgetAdded} />}
      {showAI && <AIPanel projectId={id || ""} widgetPayloads={allPayloads} onClose={() => setShowAI(false)} />}
    </div>
  );
};

export default Dashboard;
