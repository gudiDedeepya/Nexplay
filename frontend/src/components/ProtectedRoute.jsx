import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, role, roleLoading } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roleLoading) return <p role="status" className="p-8 text-center text-slate-400">Loading account...</p>;
  if (!role) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/home" replace />;
  if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />;

  return children;
}

export default ProtectedRoute;
