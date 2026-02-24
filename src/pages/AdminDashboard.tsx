import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Line, ComposedChart
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, Briefcase, TrendingUp, LayoutDashboard, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function AdminDashboard() {
    const { accessToken, handleSignOut } = useAuth();
    const navigate = useNavigate();

    const [kpis, setKpis] = useState<AdminKpis | null>(null);
    const [signupsTrend, setSignupsTrend] = useState<Series[]>([]);
    const [peakHours, setPeakHours] = useState<Series[]>([]);
    const [userLocations, setUserLocations] = useState<Series[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { 'Authorization': `Bearer ${accessToken}` };

                const [kpisRes, signupsRes, peaksRes, locationsRes] = await Promise.all([
                    fetch(`${API_BASE}/admin/kpis`, { headers }),
                    fetch(`${API_BASE}/admin/signups-trend`, { headers }),
                    fetch(`${API_BASE}/admin/peak-hours`, { headers }),
                    fetch(`${API_BASE}/admin/user-locations`, { headers })
                ]);

                if (!kpisRes.ok || !signupsRes.ok || !peaksRes.ok || !locationsRes.ok) {
                    const errorData = await kpisRes.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to fetch admin data');
                }

                const kpisData = await kpisRes.json();
                const signupsData = await signupsRes.json();
                const peaksData = await peaksRes.json();
                const locationsData = await locationsRes.json();

                setKpis(kpisData);
                setSignupsTrend(signupsData.series);
                setPeakHours(peaksData.series);
                setUserLocations(locationsData.series);
            } catch (err) {
                console.error(err);
                setError('Erreur de chargement des données admin.');
            } finally {
                setLoading(false);
            }
        };

        if (accessToken) {
            fetchData();
        }
    }, [accessToken, API_BASE]);

    const logout = async () => {
        await handleSignOut();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F0F1A] text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7B2FBE]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0F0F1A] text-white flex items-center justify-center p-4">
                <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <p className="text-red-400 mb-4">{error}</p>
                        <Button onClick={() => window.location.reload()} className="bg-[#7B2FBE] hover:bg-[#6a29a3]">Réessayer</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Prepare Tier Data for Donut
    const tierData = kpis ? [
        { name: 'Free', value: kpis.usersByTier.free, color: '#6B7280' },
        { name: 'Pro', value: kpis.usersByTier.pro, color: '#7B2FBE' },
        { name: 'Business', value: kpis.usersByTier.business, color: '#00C9A7' }
    ] : [];

    const totalPaid = (kpis?.usersByTier.pro || 0) + (kpis?.usersByTier.business || 0);
    const conversionRate = kpis?.totalUsers ? ((totalPaid / kpis.totalUsers) * 100).toFixed(1) : '0';

    // Highlight busiest hour
    const busiestHour = peakHours.length > 0 ? [...peakHours].sort((a, b) => b.value - a.value)[0] : null;

    return (
        <div className="min-h-screen bg-[#0F0F1A] text-white font-sans selection:bg-[#7B2FBE]/30">
            {/* Header */}
            <header className="h-16 border-b border-[#2A2A45] bg-[#1A1A2E]/50 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#7B2FBE] to-[#00C9A7] rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">PULSEGRID</span>
                    </div>
                    <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 font-mono text-xs">ADMIN</Badge>
                    <span className="text-[#6B7280] hidden md:inline ml-4 border-l border-[#2A2A45] pl-4">Super Admin Dashboard</span>
                </div>
                <Button variant="ghost" className="text-[#6B7280] hover:text-white hover:bg-[#2A2A45]" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                </Button>
            </header>

            <main className="p-6 max-w-[1400px] mx-auto space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users size={48} className="text-[#7B2FBE]" />
                            </div>
                            <p className="text-[#6B7280] text-sm font-medium">Utilisateurs Total</p>
                            <h3 className="text-3xl font-bold mt-1">{kpis?.totalUsers.toLocaleString()}</h3>
                            <div className="h-1 w-full bg-[#7B2FBE]/20 mt-4 rounded-full overflow-hidden">
                                <div className="h-full bg-[#7B2FBE] w-full shadow-[0_0_8px_rgba(123,47,190,0.5)]"></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp size={48} className="text-[#00C9A7]" />
                            </div>
                            <p className="text-[#6B7280] text-sm font-medium">Nouveaux (30j)</p>
                            <h3 className="text-3xl font-bold mt-1">{kpis?.newUsersLast30Days.toLocaleString()}</h3>
                            <div className="h-1 w-full bg-[#00C9A7]/20 mt-4 rounded-full overflow-hidden">
                                <div className="h-full bg-[#00C9A7] w-full shadow-[0_0_8px_rgba(0,201,167,0.5)]"></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Briefcase size={48} className="text-[#7B2FBE]" />
                            </div>
                            <p className="text-[#6B7280] text-sm font-medium">Projets Actifs</p>
                            <h3 className="text-3xl font-bold mt-1">{kpis?.totalActiveProjects.toLocaleString()}</h3>
                            <div className="h-1 w-full bg-[#7B2FBE]/20 mt-4 rounded-full overflow-hidden">
                                <div className="h-full bg-[#7B2FBE] w-full shadow-[0_0_8px_rgba(123,47,190,0.5)]"></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white overflow-hidden group">
                        <CardContent className="p-6 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp size={48} className="text-[#00C9A7]" />
                            </div>
                            <p className="text-[#6B7280] text-sm font-medium">MRR</p>
                            <h3 className="text-3xl font-bold mt-1">${((kpis?.monthlyRecurringRevenue || 0) / 100).toLocaleString()}</h3>
                            <div className="h-1 w-full bg-[#00C9A7]/20 mt-4 rounded-full overflow-hidden">
                                <div className="h-full bg-[#00C9A7] w-full shadow-[0_0_8px_rgba(0,201,167,0.5)]"></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Second Row: Distributions & Signups */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Card className="lg:col-span-5 bg-[#1A1A2E] border-[#2A2A45] text-white">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#7B2FBE]" />
                                Tier Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={tierData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {tierData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="#1A1A2E" strokeWidth={2} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center mt-4">
                                <p className="text-3xl font-bold">{totalPaid}</p>
                                <p className="text-[#6B7280] text-xs">Utilisateurs payants au total</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-7 bg-[#1A1A2E] border-[#2A2A45] text-white">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-[#00C9A7]" />
                                Signups — Last 30 Days
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={signupsTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A45" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            stroke="#6B7280"
                                            fontSize={10}
                                            tickFormatter={(val, idx) => idx % 5 === 0 ? val : ''}
                                        />
                                        <YAxis stroke="#6B7280" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="value" fill="#7B2FBE" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="value" stroke="#00C9A7" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Third Row: Peak Hours */}
                <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Peak Usage Hours (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakHours}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A45" vertical={false} />
                                    <XAxis dataKey="label" stroke="#6B7280" fontSize={10} />
                                    <YAxis stroke="#6B7280" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {peakHours.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.label === busiestHour?.label ? '#D4AF37' : '#00C9A7'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {busiestHour && (
                            <p className="mt-4 text-center text-sm">
                                <span className="text-[#D4AF37] font-bold">Heure de pointe:</span> {busiestHour.label} avec {busiestHour.value} sessions
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Fourth Row: Locations & Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#7B2FBE]" />
                                User Locations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={userLocations}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            nameKey="label"
                                        >
                                            {userLocations.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#7B2FBE', '#00C9A7', '#D4AF37', '#6B7280', '#2A2A45'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A45', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#1A1A2E] border-[#2A2A45] text-white">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-[#00C9A7]">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Taux de conversion Free → Payant</p>
                                <p className="text-2xl font-bold">{conversionRate}%</p>
                            </div>

                            <div className="border-t border-[#2A2A45] pt-4">
                                <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Revenus estimés ce mois</p>
                                <p className="text-2xl font-bold text-[#00C9A7]">${((kpis?.monthlyRecurringRevenue || 0) / 100).toLocaleString()}</p>
                            </div>

                            <div className="border-t border-[#2A2A45] pt-4">
                                <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Utilisateurs actifs aujourd'hui</p>
                                <p className="text-2xl font-bold">{peakHours.reduce((acc, curr) => acc + curr.value, 0)} <span className="text-sm font-normal text-[#6B7280] ml-2">(sessions sur 7 jours)</span></p>
                            </div>

                            <div className="border-t border-[#2A2A45] pt-4">
                                <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Tier Business</p>
                                <p className="text-sm">
                                    <span className="text-[#00C9A7] font-bold">{kpis?.usersByTier.business || 0}</span> utilisateurs · <span className="font-bold">${((kpis?.usersByTier.business || 0) * 49).toLocaleString()}</span>/mois
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
