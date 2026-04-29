import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Hexagon, FolderOpen, Settings, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: FolderOpen, label: "Projects", path: "/app/projects" },
  { icon: Settings, label: "Settings", path: "/app/settings" },
  { icon: HelpCircle, label: "Help", path: "#" },
];

const AppLayout = () => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { firebaseUser, profile, handleSignOut } = useAuth();

  const displayName = profile?.name || firebaseUser?.displayName || "User";
  const displayEmail = firebaseUser?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const onLogout = async () => {
    await handleSignOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-all duration-200 ${expanded ? "w-[220px]" : "w-16"
          }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border">
          <Hexagon size={24} className="text-primary fill-primary/20 shrink-0" />
          {expanded && <span className="ml-2 font-bold text-foreground whitespace-nowrap">PulseGrid</span>}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item, i) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={i}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-body ${active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                  }`}
              >
                <item.icon size={20} className="shrink-0" />
                {expanded && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={displayName}
                className="w-8 h-8 rounded-full shrink-0 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                {initials}
              </div>
            )}
            {expanded && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              </div>
            )}
            {expanded && (
              <button onClick={onLogout} title="Sign out">
                <LogOut size={16} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-16">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
