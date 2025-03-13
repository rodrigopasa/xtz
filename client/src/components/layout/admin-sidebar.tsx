import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard,
  Book,
  Bookmark,
  User, // Usando o ícone básico de usuário para autores
  Users,
  MessageSquare,
  BarChart,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export default function AdminSidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/admin" && location === "/admin") {
      return true;
    }
    if (path !== "/admin" && location.startsWith(path)) {
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/livros", label: "Livros", icon: Book },
    { path: "/admin/categorias", label: "Categorias", icon: Bookmark },
    { path: "/admin/autores", label: "Autores", icon: User },
    { path: "/admin/usuarios", label: "Usuários", icon: Users },
    { path: "/admin/comentarios", label: "Comentários", icon: MessageSquare },
    { path: "/admin/relatorios", label: "Relatórios", icon: BarChart },
    { path: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-neutral-900 text-white shadow-md hidden md:block">
      <nav className="py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center py-3 px-6",
                isActive(item.path)
                  ? "bg-primary text-white font-medium"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-neutral-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center py-3 px-6 text-neutral-300 hover:bg-neutral-800 hover:text-white text-left"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
        </div>
      </nav>
    </aside>
  );
}
