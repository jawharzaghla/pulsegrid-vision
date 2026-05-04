import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Line, ComposedChart, AreaChart, Area
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    LogOut, Users, Briefcase, TrendingUp, LayoutDashboard, 
    MapPin, ShieldAlert, ShieldCheck, UserMinus, UserPlus, 
    ExternalLink, Search, Filter, MoreVertical, Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminKpis {
    totalUsers: number;
    newUsersLast30Days: number;
    totalActiveProjects: number;
    monthlyRecurringRevenue: number;
    usersByTier: { free: number; pro: number; business: number };
}

interface Series {
    label: string;
    value: number;
}

interface UserProfile {
    id: string;
    email: string;
    name: string;
    tier: 'free' | 'pro' | 'business';
    isBanned?: boolean;
    createdAt: string;
}

interface ProjectInfo {
    id: string;
    name: string;
    userId: string;
    emoji: string;
    createdAt: string;
}

export default function AdminDashboard() {
    const { accessToken, handleSignOut } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [kpis, setKpis] = useState<AdminKpis | null>(null);
    const [signupsTrend, setSignupsTrend] = useState<Series[]>([]);
    const [peakHours, setPeakHours] = useState<Series[]>([]);
    const [userLocations, setUserLocations] = useState<Series[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [projects, setProjects] = useState<ProjectInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${accessToken}` };

            const [kpisRes, signupsRes, peaksRes, locationsRes, usersRes, projectsRes] = await Promise.all([
                fetch(`${API_BASE}/admin/kpis`, { headers }),
                fetch(`${API_BASE}/admin/signups-trend`, { headers }),
                fetch(`${API_BASE}/admin/peak-hours`, { headers }),
                fetch(`${API_BASE}/admin/user-locations`, { headers }),
                fetch(`${API_BASE}/admin/users`, { headers }),
                fetch(`${API_BASE}/admin/projects`, { headers })
            ]);

            if (!kpisRes.ok || !signupsRes.ok || !peaksRes.ok || !locationsRes.ok || !usersRes.ok || !projectsRes.ok) {
                throw new Error('Failed to fetch admin data');
            }

            const kpisData = await kpisRes.json();
            const signupsData = await signupsRes.json();
            const peaksData = await peaksRes.json();
            const locationsData = await locationsRes.json();
            const usersData = await usersRes.json();
            const projectsData = await projectsRes.json();

            setKpis(kpisData);
            setSignupsTrend(signupsData.series);
            setPeakHours(peaksData.series);
            setUserLocations(locationsData.series);
            setUsers(usersData.users);
            setProjects(projectsData.projects);
        } catch (err) {
            console.error(err);
            setError('Erreur de chargement des données admin.');
            toast.error("Erreur lors de la récupération des données");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accessToken) {
            fetchData();
        }
    }, [accessToken]);

    const handleBanUser = async (userId: string, isBanned: boolean) => {
        try {
            const res = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isBanned })
            });

            if (res.ok) {
                toast.success(isBanned ? "Utilisateur banni" : "Utilisateur réactivé");
                fetchData();
            }
        } catch (err) {
            toast.error("Échec de l'action sur l'utilisateur");
        }
    };

    const handleChangeTier = async (userId: string, tier: string) => {
        try {
            const res = await fetch(`${API_BASE}/admin/users/${userId}/tier`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tier })
            });

            if (res.ok) {
                toast.success(`Tier mis à jour: ${tier}`);
                fetchData();
            }
        } catch (err) {
            toast.error("Échec de la mise à jour du tier");
        }
    };

    const logout = async () => {
        await handleSignOut();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F0F1A] text-white flex flex-col items-center justify-center">
                <div className="relative w-20 h-20 mb-4">
                    <div className="absolute inset-0 border-4 border-[#7B2FBE]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-[#7B2FBE] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-[#00C9A7]/20 rounded-full"></div>
                    <div className="absolute inset-2 border-4 border-b-[#00C9A7] border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin-slow"></div>
                </div>
                <p className="text-[#6B7280] animate-pulse font-mono tracking-widest text-xs">PULSEGRID SYSTEM INITIALIZING...</p>
            </div>
        );
    }

    // Preparations
    const tierData = kpis ? [
        { name: 'Free', value: kpis.usersByTier.free, color: '#6B7280' },
        { name: 'Pro', value: kpis.usersByTier.pro, color: '#7B2FBE' },
        { name: 'Business', value: kpis.usersByTier.business, color: '#00C9A7' }
    ] : [];

    const totalPaid = (kpis?.usersByTier.pro || 0) + (kpis?.usersByTier.business || 0);
    const conversionRate = kpis?.totalUsers ? ((totalPaid / kpis.totalUsers) * 100).toFixed(1) : '0';
    const busiestHour = peakHours.length > 0 ? [...peakHours].sort((a, b) => b.value - a.value)[0] : null;

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0F0F1A] text-white font-sans selection:bg-[#7B2FBE]/30">
            {/* Header */}
            <header className="h-20 border-b border-[#2A2A45] bg-[#1A1A2E]/50 backdrop-blur-xl sticky top-0 z-50 px-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#7B2FBE] to-[#00C9A7] rounded-xl flex items-center justify-center shadow-lg shadow-[#7B2FBE]/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-xl tracking-tighter leading-none">PULSEGRID</span>
                            <span className="text-[10px] text-[#00C9A7] font-mono tracking-[0.2em] leading-none mt-1 uppercase">Control Center</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[#FF4B4B] border-[#FF4B4B]/30 bg-[#FF4B4B]/10 font-mono text-[10px] py-0.5">MASTER_ADMIN</Badge>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users or projects..." 
                            className="bg-[#0F0F1A]/50 border-[#2A2A45] pl-10 w-64 focus:ring-[#7B2FBE]"
                        />
                    </div>
                    <Button variant="ghost" className="text-[#6B7280] hover:text-white hover:bg-[#2A2A45] rounded-xl px-4" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </header>

            <main className="p-8 max-w-[1600px] mx-auto">
                <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <TabsList className="bg-[#1A1A2E] border border-[#2A2A45] p-1 h-12">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-[#7B2FBE] data-[state=active]:text-white h-full px-6 transition-all">Overview</TabsTrigger>
                            <TabsTrigger value="users" className="data-[state=active]:bg-[#7B2FBE] data-[state=active]:text-white h-full px-6 transition-all">Users Management</TabsTrigger>
                            <TabsTrigger value="projects" className="data-[state=active]:bg-[#7B2FBE] data-[state=active]:text-white h-full px-6 transition-all">Global Projects</TabsTrigger>
                        </TabsList>
                        
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="bg-transparent border-[#2A2A45] hover:bg-[#2A2A45] text-white" onClick={fetchData}>
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Refresh Data
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Users', value: kpis?.totalUsers, icon: Users, color: '#7B2FBE' },
                                { label: 'Active Projects', value: kpis?.totalActiveProjects, icon: Briefcase, color: '#00C9A7' },
                                { label: 'New Users (30d)', value: kpis?.newUsersLast30Days, icon: TrendingUp, color: '#7B2FBE' },
                                { label: 'Monthly Revenue', value: `$${((kpis?.monthlyRecurringRevenue || 0) / 100).toLocaleString()}`, icon: TrendingUp, color: '#00C9A7' }
                            ].map((kpi, idx) => (
                                <Card key={idx} className="bg-[#1A1A2E] border-[#2A2A45] hover:border-[#7B2FBE]/50 transition-all group relative overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#0F0F1A] flex items-center justify-center border border-[#2A2A45] group-hover:border-[#7B2FBE]/50 transition-colors">
                                                <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-mono text-[#6B7280] uppercase tracking-tighter">Live Monitor</span>
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-[8px] text-green-500/80 font-mono">STABLE</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[#6B7280] text-sm font-medium">{kpi.label}</p>
                                        <h3 className="text-3xl font-black mt-1 tracking-tight">{kpi.value?.toLocaleString() || '0'}</h3>
                                    </CardContent>
                                    <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#7B2FBE] to-transparent w-full opacity-30"></div>
                                </Card>
                            ))}
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <Card className="lg:col-span-8 bg-[#1A1A2E] border-[#2A2A45]">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-[#00C9A7]" />
                                            Growth Analytics
                                        </CardTitle>
                                        <CardDescription className="text-[#6B7280]">Daily registration volume and trend forecasting</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[400px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={signupsTrend}>
                                                <defs>
                                                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#7B2FBE" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#7B2FBE" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A45" vertical={false} />
                                                <XAxis dataKey="label" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#7B2FBE" strokeWidth={3} fillOpacity={1} fill="url(#colorSignups)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-4 bg-[#1A1A2E] border-[#2A2A45]">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-[#7B2FBE]" />
                                        Tier Mix
                                    </CardTitle>
                                    <CardDescription className="text-[#6B7280]">Revenue distribution across subscription tiers</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={tierData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={110}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                >
                                                    {tierData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#1A1A2E" strokeWidth={4} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-6">
                                        {tierData.map((t, idx) => (
                                            <div key={idx} className="flex flex-col items-center p-3 rounded-xl bg-[#0F0F1A] border border-[#2A2A45]">
                                                <span className="text-[10px] text-[#6B7280] font-mono uppercase mb-1">{t.name}</span>
                                                <span className="text-lg font-bold" style={{ color: t.color }}>{t.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Extra Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <Card className="bg-[#1A1A2E] border-[#2A2A45]">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-[#00C9A7]" />
                                        Geographic Presence
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {userLocations.slice(0, 5).map((loc, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium">{loc.label}</span>
                                                </div>
                                                <div className="flex items-center gap-3 flex-1 ml-4">
                                                    <div className="h-1.5 bg-[#0F0F1A] rounded-full flex-1 overflow-hidden">
                                                        <div className="h-full bg-[#00C9A7] rounded-full" style={{ width: `${(loc.value / kpis!.totalUsers) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] text-[#6B7280] w-8">{loc.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                             </Card>

                             <Card className="bg-[#1A1A2E] border-[#2A2A45]">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-[#7B2FBE]" />
                                        Conversion Analytics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col justify-center items-center h-full pt-0">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-[#0F0F1A]" />
                                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                                strokeDasharray={364} strokeDashoffset={364 - (364 * parseFloat(conversionRate)) / 100}
                                                strokeLinecap="round" className="text-[#7B2FBE]" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black">{conversionRate}%</span>
                                            <span className="text-[8px] text-[#6B7280] font-mono">CONVERSION</span>
                                        </div>
                                    </div>
                                    <p className="text-center text-[#6B7280] text-xs mt-4">Free to Paid subscriber ratio</p>
                                </CardContent>
                             </Card>

                             <Card className="bg-[#1A1A2E] border-[#2A2A45]">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-[#00C9A7]" />
                                        System Health
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="p-3 bg-[#0F0F1A] border border-[#2A2A45] rounded-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-[#6B7280]">AI PROXY LATENCY</span>
                                                <span className="text-[10px] text-[#00C9A7] font-mono">142ms</span>
                                            </div>
                                            <div className="h-1 bg-[#2A2A45] rounded-full overflow-hidden">
                                                <div className="h-full bg-[#00C9A7] w-[15%]"></div>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-[#0F0F1A] border border-[#2A2A45] rounded-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-[#6B7280]">STORAGE LOAD</span>
                                                <span className="text-[10px] text-[#7B2FBE] font-mono">24%</span>
                                            </div>
                                            <div className="h-1 bg-[#2A2A45] rounded-full overflow-hidden">
                                                <div className="h-full bg-[#7B2FBE] w-[24%]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                             </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-[#1A1A2E] border-[#2A2A45]">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Global User Registry</CardTitle>
                                    <CardDescription>Manage all {users.length} accounts registered on PulseGrid</CardDescription>
                                </div>
                                <Badge variant="outline" className="font-mono bg-[#7B2FBE]/10 text-[#7B2FBE] border-[#7B2FBE]/20">
                                    {filteredUsers.length} Results
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#2A2A45] text-[#6B7280] text-xs uppercase tracking-widest">
                                                <th className="py-4 px-4 font-medium">User</th>
                                                <th className="py-4 px-4 font-medium">Account Details</th>
                                                <th className="py-4 px-4 font-medium">Subscription</th>
                                                <th className="py-4 px-4 font-medium text-right">Access Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {filteredUsers.map((user) => (
                                                <tr key={user.id} className="border-b border-[#2A2A45]/50 hover:bg-[#0F0F1A]/30 transition-colors group">
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7B2FBE]/20 to-[#00C9A7]/20 flex items-center justify-center border border-[#2A2A45] text-[#7B2FBE] font-bold">
                                                                {user.name?.[0] || user.email[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{user.name || 'Anonymous User'}</span>
                                                                <span className="text-xs text-[#6B7280]">{user.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-[#6B7280] font-mono">UID:</span>
                                                                <span className="text-[10px] text-[#6B7280] font-mono truncate max-w-[100px]">{user.id}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-[#6B7280] font-mono">SINCE:</span>
                                                                <span className="text-[10px] text-[#6B7280] font-mono">{new Date(user.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex gap-1">
                                                                {['free', 'pro', 'business'].map((t) => (
                                                                    <button 
                                                                        key={t}
                                                                        onClick={() => handleChangeTier(user.id, t)}
                                                                        className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${user.tier === t ? 'bg-[#7B2FBE] text-white shadow-lg' : 'bg-[#2A2A45] text-[#6B7280] hover:bg-[#3A3A55]'}`}
                                                                    >
                                                                        {t}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${user.tier === 'free' ? 'bg-[#6B7280]' : user.tier === 'pro' ? 'bg-[#7B2FBE]' : 'bg-[#00C9A7]'}`}></div>
                                                                <span className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">{user.tier} Tier</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {user.isBanned ? (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    className="h-9 px-4 rounded-xl bg-[#00C9A7]/10 text-[#00C9A7] hover:bg-[#00C9A7]/20 border border-[#00C9A7]/20"
                                                                    onClick={() => handleBanUser(user.id, false)}
                                                                >
                                                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                                                    Unban
                                                                </Button>
                                                            ) : (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    className="h-9 px-4 rounded-xl bg-[#FF4B4B]/10 text-[#FF4B4B] hover:bg-[#FF4B4B]/20 border border-[#FF4B4B]/20"
                                                                    onClick={() => handleBanUser(user.id, true)}
                                                                >
                                                                    <ShieldAlert className="w-4 h-4 mr-2" />
                                                                    Ban
                                                                </Button>
                                                            )}
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-[#2A2A45]">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-[#1A1A2E] border-[#2A2A45] text-white">
                                                                    <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator className="bg-[#2A2A45]" />
                                                                    <DropdownMenuItem className="focus:bg-[#2A2A45] focus:text-white cursor-pointer">View Details</DropdownMenuItem>
                                                                    <DropdownMenuItem className="focus:bg-[#2A2A45] focus:text-white cursor-pointer">Login as User</DropdownMenuItem>
                                                                    <DropdownMenuItem className="focus:bg-[#FF4B4B]/20 focus:text-[#FF4B4B] text-[#FF4B4B] cursor-pointer">Force Reset Password</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="projects" className="animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-[#1A1A2E] border-[#2A2A45]">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Platform Project Hub</CardTitle>
                                    <CardDescription>Monitor every dashboard and workspace created by PulseGrid users</CardDescription>
                                </div>
                                <Badge variant="outline" className="font-mono bg-[#00C9A7]/10 text-[#00C9A7] border-[#00C9A7]/20">
                                    {filteredProjects.length} Projects Total
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredProjects.map((project) => (
                                        <Card key={project.id} className="bg-[#0F0F1A] border-[#2A2A45] hover:border-[#7B2FBE]/50 transition-all overflow-hidden group">
                                            <CardContent className="p-0">
                                                <div className="h-24 bg-gradient-to-br from-[#1A1A2E] to-[#2A2A45] p-6 relative flex items-end">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#0F0F1A] border border-[#2A2A45] flex items-center justify-center text-2xl absolute -bottom-6 left-6 shadow-xl group-hover:scale-110 transition-transform">
                                                        {project.emoji}
                                                    </div>
                                                    <div className="absolute top-4 right-4 flex gap-2">
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="w-8 h-8 rounded-lg bg-[#0F0F1A]/80 text-[#6B7280] hover:text-white"
                                                            onClick={() => navigate(`/app/projects/${project.id}`)}
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg bg-[#0F0F1A]/80 text-[#6B7280] hover:text-white">
                                                            <Settings2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="p-6 pt-10">
                                                    <h4 className="font-bold text-lg truncate">{project.name}</h4>
                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2A45]">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-mono">Owner ID</span>
                                                            <span className="text-xs font-mono text-[#7B2FBE] truncate max-w-[120px]">{project.userId}</span>
                                                        </div>
                                                        <div className="text-right flex flex-col">
                                                            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-mono">Deployment</span>
                                                            <span className="text-xs">{new Date(project.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        className="w-full mt-6 bg-transparent border border-[#7B2FBE]/30 hover:bg-[#7B2FBE] hover:text-white text-[#7B2FBE] rounded-xl transition-all"
                                                        onClick={() => navigate(`/app/projects/${project.id}`)}
                                                    >
                                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                                        Master Open Dashboard
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Custom Animations */}
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
                .selection\\:bg-\\[\\#7B2FBE\\]\\/30 ::selection {
                    background-color: rgba(123, 47, 190, 0.3);
                }
            `}</style>
        </div>
    );
}
