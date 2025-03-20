import { Link } from "wouter";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, isAuthenticated, logout } = useAuth();
  
  // Buscar configurações do site
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('GET', '/api/settings')
  });

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="sm:max-w-md w-full bg-gray-900 border-r border-purple-500/20 text-white">
        <SheetHeader className="border-b border-purple-500/20 pb-4">
          <SheetTitle className="font-serif font-bold text-2xl gradient-heading">
            {settings?.siteName || "Elexandria"}
          </SheetTitle>
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 text-white">
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar</span>
          </SheetClose>
        </SheetHeader>

        <nav className="p-4">
          <ul className="space-y-4">
            <li>
              <Link 
                href="/explorar" 
                className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                onClick={onClose}
              >
                Explorar
              </Link>
            </li>
            <li>
              <Link 
                href="/categorias" 
                className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                onClick={onClose}
              >
                Categorias
              </Link>
            </li>
            <li>
              <Link 
                href="/lancamentos" 
                className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                onClick={onClose}
              >
                Lançamentos
              </Link>
            </li>
            <li>
              <Link 
                href="/mais-lidos" 
                className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                onClick={onClose}
              >
                Mais Lidos
              </Link>
            </li>
            <li>
              <Link 
                href="/autores" 
                className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                onClick={onClose}
              >
                Autores
              </Link>
            </li>
            <li>
              <Link 
                href="/livros-gratuitos" 
                className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                onClick={onClose}
              >
                Livros Gratuitos
              </Link>
            </li>

            {isAuthenticated && (
              <>
                <li className="border-t border-purple-500/20 pt-4 mt-4">
                  <Link 
                    href="/perfil" 
                    className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                    onClick={onClose}
                  >
                    Meu Perfil
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/favoritos" 
                    className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                    onClick={onClose}
                  >
                    Favoritos
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/historico" 
                    className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                    onClick={onClose}
                  >
                    Histórico de Leitura
                  </Link>
                </li>
                {user?.role === "admin" && (
                  <li>
                    <Link 
                      href="/admin" 
                      className="block p-2 font-medium text-white hover:bg-purple-900/30 rounded"
                      onClick={onClose}
                    >
                      Painel Admin
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>

        <SheetFooter className="border-t border-purple-500/20 pt-4 mt-auto">
          {isAuthenticated ? (
            <Button variant="destructive" className="w-full bg-red-600 hover:bg-red-700" onClick={handleLogout}>
              Sair
            </Button>
          ) : (
            <div className="flex flex-col w-full gap-2">
              <Button asChild variant="default" className="w-full bg-purple-600 hover:bg-purple-700">
                <Link href="/login" onClick={onClose}>Entrar</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-purple-500 text-white hover:bg-purple-900/30">
                <Link href="/cadastro" onClick={onClose}>Cadastrar</Link>
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
