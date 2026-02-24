import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { accessToken, loading } = useAuth();

    if (loading) return null;

    const getRoleFromToken = (token: string | null) => {
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role;
        } catch {
            return null;
        }
    };

    const role = getRoleFromToken(accessToken);

    if (role === 'admin') {
        return <>{children}</>;
    }

    return <Navigate to="/login" replace />;
}
