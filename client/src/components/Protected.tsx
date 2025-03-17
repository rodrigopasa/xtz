import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedProps {
  children: React.ReactNode;
  role?: "admin" | "user";
}

export default function Protected({ children, role }: ProtectedProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/login");
      } else if (role && user?.role !== role) {
        navigate("/");
      }
    }
  }, [isAuthenticated, isLoading, user, role, navigate]);

  // Mostrar nada enquanto carrega
  if (isLoading) {
    return null;
  }

  // Se autenticado e com papel correto, mostrar conteúdo
  if (isAuthenticated && (!role || user?.role === role)) {
    return <>{children}</>;
  }

  // Caso contrário, não mostrar nada (o useEffect cuidará do redirecionamento)
  return null;
}