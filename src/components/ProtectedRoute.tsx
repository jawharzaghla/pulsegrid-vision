// ============================================
// PulseGrid — Protected Route Component
// React equivalent of Angular's authGuard
// Redirects unauthenticated users to /login
// ============================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Hexagon } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { firebaseUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Hexagon size={40} className="text-primary fill-primary/20 animate-pulse" />
                    <p className="text-sm text-muted-foreground">Loading PulseGrid...</p>
                </div>
            </div>
        );
    }

    if (!firebaseUser) {
        // Preserve the intended destination so we can redirect after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
