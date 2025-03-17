import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface ProtectedProps {
  children: React.ReactNode;
  role?: "admin" | "user";
}

export default function Protected({ children, role }: ProtectedProps) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (role && user?.role !== role) {
    setLocation("/");
    return null;
  }

  return <>{children}</>;
}