import { Link } from "wouter";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="sm:max-w-md w-full">
        <SheetHeader className="border-b border-neutral-200 pb-4">
          <SheetTitle className="font-serif font-bold text-2xl text-primary">BiblioTech</SheetTitle>
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar</span>
          </SheetClose>
        </SheetHeader>

        <nav className="p-4">
          <ul className="space-y-4">
            <li>
              <Link 
                href="/categorias" 
                className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                onClick={onClose}
              >
                Categorias
              </Link>
            </li>
            <li>
              <Link 
                href="/lancamentos" 
                className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                onClick={onClose}
              >
                Lançamentos
              </Link>
            </li>
            <li>
              <Link 
                href="/mais-lidos" 
                className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                onClick={onClose}
              >
                Mais Lidos
              </Link>
            </li>
            <li>
              <Link 
                href="/autores" 
                className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                onClick={onClose}
              >
                Autores
              </Link>
            </li>
            <li>
              <Link 
                href="/livros-gratuitos" 
                className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                onClick={onClose}
              >
                Livros Gratuitos
              </Link>
            </li>

            {isAuthenticated && (
              <>
                <li className="border-t border-neutral-200 pt-4 mt-4">
                  <Link 
                    href="/perfil" 
                    className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                    onClick={onClose}
                  >
                    Meu Perfil
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/favoritos" 
                    className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                    onClick={onClose}
                  >
                    Favoritos
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/historico" 
                    className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
                    onClick={onClose}
                  >
                    Histórico de Leitura
                  </Link>
                </li>
                {user?.role === "admin" && (
                  <li>
                    <Link 
                      href="/admin" 
                      className="block p-2 font-medium text-neutral-800 hover:bg-neutral-100 rounded"
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

        <SheetFooter className="border-t border-neutral-200 pt-4 mt-auto">
          {isAuthenticated ? (
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              Sair
            </Button>
          ) : (
            <div className="flex flex-col w-full gap-2">
              <Button asChild variant="default" className="w-full">
                <Link href="/login" onClick={onClose}>Entrar</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/cadastro" onClick={onClose}>Cadastrar</Link>
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
