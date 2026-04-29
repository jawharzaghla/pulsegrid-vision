// ============================================
// PulseGrid — Demo Layout
// Wrapper for demo pages with sidebar & demo banner
// ============================================

import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, ArrowLeft, Sparkles, Crown, Zap } from 'lucide-react';
import { DemoProvider } from '@/contexts/DemoContext';
import type { DemoTier } from '@/config/demo-ids';
import PulseGridLogo from '@/components/PulseGridLogo';

interface DemoLayoutProps {
  tier: DemoTier;
}

const tierConfig = {
  free: { label: 'Free', color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Zap, badge: 'border-border' },
  pro: { label: 'Pro', color: 'text-primary', bg: 'bg-primary/10', icon: Sparkles, badge: 'border-primary' },
  business: { label: 'Business', color: 'text-accent', bg: 'bg-accent/10', icon: Crown, badge: 'border-accent' },
};

const DemoLayout = ({ tier }: DemoLayoutProps) => {
  const location = useLocation();
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <DemoProvider tier={tier}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border flex flex-col bg-card shrink-0">
          {/* Logo */}
          <div className="p-5 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <PulseGridLogo />
            </Link>
          </div>

          {/* Demo Badge */}
          <div className={`mx-4 mt-4 px-3 py-2 rounded-lg ${config.bg} border ${config.badge} flex items-center gap-2`}>
            <Icon size={14} className={config.color} />
            <span className={`text-xs font-semibold ${config.color}`}>
              DEMO MODE — {config.label.toUpperCase()}
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              to={tier === 'free' ? `/demo/free` : `/demo/${tier}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                location.pathname.endsWith(`/demo/${tier}`) || location.pathname.includes('/projects')
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tier === 'free' ? <LayoutDashboard size={18} /> : <FolderOpen size={18} />}
              {tier === 'free' ? 'Dashboard' : 'Projects'}
            </Link>
          </nav>

          {/* Back to Home */}
          <div className="p-4 border-t border-border">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Demo banner */}
          <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-muted-foreground">
                You're viewing a <span className={`font-semibold ${config.color}`}>{config.label}</span> plan demo with live data
              </span>
            </div>
            <Link
              to="/signup"
              className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg transition-all"
            >
              Sign Up Free
            </Link>
          </div>

          <Outlet />
        </main>
      </div>
    </DemoProvider>
  );
};

export default DemoLayout;
