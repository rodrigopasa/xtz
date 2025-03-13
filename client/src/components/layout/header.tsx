import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Book, Search, Heart, User, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import MobileMenu from "./mobile-menu";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout, checkAuth } = useAuth();
  
  // DEBUG: Verificar estado de autenticação
  useEffect(() => {
    console.log("Header: Estado de autenticação:", { isAuthenticated, user });
  }, [isAuthenticated, user]);

  // Fechar o menu móvel quando a localização muda
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user || !user.name) return "U";
    return user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <header className="glass-card shadow-lg bg-black/30 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-white text-3xl">
              <Book />
            </span>
            <span className="font-serif font-bold text-2xl gradient-heading">BiblioTech</span>
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:block w-1/3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="text"
                placeholder="Pesquisar livros, autores..."
                className="w-full py-2 pl-4 pr-10 rounded-full border border-purple-500/20 bg-black/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                type="submit" 
                variant="ghost" 
                size="icon" 
                className="absolute right-3 top-2.5 text-white/70 hover:text-white"
              >
                <Search size={18} />
              </Button>
            </form>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/categorias" className="font-medium text-white hover:text-purple-300 transition-colors">
              Categorias
            </Link>
            <Link href="/lancamentos" className="font-medium text-white hover:text-purple-300 transition-colors">
              Lançamentos
            </Link>
            <Link href="/mais-lidos" className="font-medium text-white hover:text-purple-300 transition-colors">
              Mais Lidos
            </Link>
            <Link href="/autores" className="font-medium text-white hover:text-purple-300 transition-colors">
              Autores
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <Link href="/favoritos" className="text-white hover:text-purple-300">
                <Heart size={20} />
              </Link>
            )}
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="p-0 hover:bg-transparent" aria-label="Menu do usuário">
                    <Avatar className="h-8 w-8 ring-2 ring-purple-500/50">
                      <AvatarImage src={user?.avatarUrl} alt={user?.name || "Usuário"} />
                      <AvatarFallback className="bg-purple-800 text-white">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-900 border border-purple-500/20 text-white">
                  <DropdownMenuItem asChild className="focus:bg-purple-900 focus:text-white">
                    <Link href="/perfil">Meu Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-purple-900 focus:text-white">
                    <Link href="/favoritos">Favoritos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-purple-900 focus:text-white">
                    <Link href="/historico">Histórico de Leitura</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-purple-900 focus:text-white">
                    <Link href="/configuracoes">Configurações</Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <>
                      <DropdownMenuSeparator className="bg-purple-500/20" />
                      <DropdownMenuItem asChild className="focus:bg-purple-900 focus:text-white">
                        <Link href="/admin">Painel Admin</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-purple-500/20" />
                  <DropdownMenuItem onClick={handleLogout} className="focus:bg-purple-900 focus:text-white">
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="secondary" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                  <User size={20} className="mr-2" />
                  Entrar
                </Button>
              </Link>
            )}
            
            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-white hover:bg-purple-900/30"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu size={24} />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Search (Visible on small screens) */}
      <div className="md:hidden px-4 pb-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Input
            type="text"
            placeholder="Pesquisar livros, autores..."
            className="w-full py-2 pl-4 pr-10 rounded-full border border-purple-500/20 bg-black/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button 
            type="submit" 
            variant="ghost" 
            size="icon" 
            className="absolute right-3 top-2.5 text-white/70 hover:text-white"
          >
            <Search size={18} />
          </Button>
        </form>
      </div>

      {/* Mobile Menu */}
      <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
    </header>
  );
}
