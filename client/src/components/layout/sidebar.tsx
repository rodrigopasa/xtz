import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  UserCircle, 
  Heart, 
  History, 
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) {
    return null;
  }

  const getUserInitials = () => {
    if (!user.name) return "U";
    return user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { path: "/perfil", label: "Meu Perfil", icon: UserCircle },
    { path: "/favoritos", label: "Favoritos", icon: Heart },
    { path: "/historico", label: "Histórico", icon: History },
    { path: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white shadow-md hidden md:block">
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Avatar className="w-14 h-14 mr-3">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-neutral-500">
              {user.role === 'admin' ? 'Administrador' : 'Leitor'}
            </p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center py-2 px-3 rounded-lg font-medium",
                  isActive(item.path)
                    ? "bg-primary text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="w-full flex items-center py-2 px-3 rounded-lg text-neutral-700 hover:bg-neutral-100 font-medium mt-4"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
        </nav>
      </div>
    </aside>
  );
}
