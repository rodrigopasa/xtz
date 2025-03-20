import { useState } from "react";
import { Link } from "wouter";
import { Book, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";

export default function AdminHeader() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const getUserInitials = () => {
    if (!user.name) return "A";
    return user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/livros", label: "Livros" },
    { path: "/admin/series", label: "Séries" },
    { path: "/admin/categorias", label: "Categorias" },
    { path: "/admin/autores", label: "Autores" },
    { path: "/admin/usuarios", label: "Usuários" },
    { path: "/admin/comentarios", label: "Comentários" },
    { path: "/admin/relatorios", label: "Relatórios" },
    { path: "/admin/configuracoes", label: "Configurações" },
  ];

  return (
    <header className="bg-neutral-800 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/admin" className="flex items-center space-x-2">
            <span className="text-white text-2xl">
              <Book />
            </span>
            <span className="font-serif font-bold text-xl">Elexandria Admin</span>
          </Link>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            <span className="hidden md:inline-block text-neutral-300">Administrador</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative group p-0 hover:bg-transparent">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-neutral-800"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/perfil">Meu Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">Voltar ao Site</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu size={24} className="text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Admin Menu */}
      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetContent side="left" className="bg-neutral-900 text-white border-neutral-700">
          <SheetHeader className="border-b border-neutral-700 pb-4">
            <SheetTitle className="text-white font-serif">Elexandria Admin</SheetTitle>
            <SheetClose className="absolute right-4 top-4 rounded-sm text-neutral-400 hover:text-white" />
          </SheetHeader>

          <nav className="py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className="block py-2 px-4 text-neutral-300 hover:bg-neutral-800 hover:text-white rounded"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <SheetFooter className="border-t border-neutral-700 pt-4 mt-auto">
            <div className="flex flex-col w-full gap-2">
              <Button asChild variant="outline" className="w-full bg-transparent text-white border-neutral-600 hover:bg-neutral-800">
                <Link href="/" onClick={() => setShowMobileMenu(false)}>Voltar ao Site</Link>
              </Button>
              <Button variant="destructive" className="w-full" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  );
}