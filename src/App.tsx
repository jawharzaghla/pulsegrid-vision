import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Projects from "./pages/Projects";
import Dashboard from "./pages/Dashboard";
import ProjectSettings from "./pages/ProjectSettings";
import AccountSettings from "./pages/AccountSettings";
import AppLayout from "./components/AppLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGuard from "./components/AdminGuard";
import NotFound from "./pages/NotFound";
import DemoLayout from "./components/DemoLayout";
import DemoFree from "./pages/DemoFree";
import DemoProjects from "./pages/DemoProjects";
import DemoDashboard from "./pages/DemoDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<Dashboard />} />
              <Route path="projects/:id/settings" element={<ProjectSettings />} />
              <Route path="settings" element={<AccountSettings />} />
            </Route>
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />

            {/* Demo Routes — No Auth Required */}
            <Route path="/demo/free" element={<DemoLayout tier="free" />}>
              <Route index element={<DemoFree />} />
            </Route>
            <Route path="/demo/pro" element={<DemoLayout tier="pro" />}>
              <Route index element={<DemoProjects tier="pro" />} />
              <Route path="projects/:id" element={<DemoDashboard tier="pro" />} />
            </Route>
            <Route path="/demo/business" element={<DemoLayout tier="business" />}>
              <Route index element={<DemoProjects tier="business" />} />
              <Route path="projects/:id" element={<DemoDashboard tier="business" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
