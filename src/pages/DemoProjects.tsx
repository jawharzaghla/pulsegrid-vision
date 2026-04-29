import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, Crown } from 'lucide-react';
import { PRO_PROJECTS, BUSINESS_PROJECTS } from '@/config/demo-projects';
import { TIER_LIMITS } from '@/types/models';
import type { DemoTier } from '@/config/demo-ids';
import type { Project } from '@/types/models';

interface DemoProjectsProps {
  tier: DemoTier;
}

const DemoProjects = ({ tier }: DemoProjectsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const projects: Project[] = tier === 'pro' ? PRO_PROJECTS : BUSINESS_PROJECTS;
  const limits = TIER_LIMITS[tier];
  const filtered = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">My Projects</h1>
          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
            tier === 'pro' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-accent/10 text-accent border-accent/30'
          }`}>{tier} Plan</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 transition-all" />
          </div>
          <div className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/30 rounded-lg border border-border">
            {projects.length} / {limits.projects === Infinity ? '∞' : limits.projects} projects
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(project => (
          <Link key={project.id} to={`/demo/${tier}/projects/${project.id}`}
            className="group glass rounded-xl p-5 card-shadow border-l-2 border-l-primary transition-all hover:border-primary/40 hover:scale-[1.02] flex flex-col h-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">{project.emoji}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{project.name}</h3>
                <p className="text-body text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4">
              <span className="flex items-center gap-1">
                {tier === 'pro' ? <Sparkles size={12} className="text-primary" /> : <Crown size={12} className="text-accent" />} Live data
              </span>
              <span className="px-2 py-0.5 bg-muted/50 rounded-full">{project.widgets.length} widgets</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-6 glass rounded-xl border border-border/50">
        <div className="grid grid-cols-4 gap-6 text-center">
          <div><p className="text-2xl font-bold">{limits.projects === Infinity ? '∞' : limits.projects}</p><p className="text-xs text-muted-foreground mt-1">Projects</p></div>
          <div><p className="text-2xl font-bold">{limits.widgetsPerProject === Infinity ? '∞' : limits.widgetsPerProject}</p><p className="text-xs text-muted-foreground mt-1">Widgets / Project</p></div>
          <div><p className="text-2xl font-bold">{limits.aiAnalysesPerDay === Infinity ? '∞' : limits.aiAnalysesPerDay}</p><p className="text-xs text-muted-foreground mt-1">AI Analyses / Day</p></div>
          <div><p className="text-2xl font-bold">{limits.teamMembers}</p><p className="text-xs text-muted-foreground mt-1">Team Members</p></div>
        </div>
      </div>
    </div>
  );
};

export default DemoProjects;
