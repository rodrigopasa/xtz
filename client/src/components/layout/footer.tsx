import { Link } from "wouter";
import { 
  Book,
  Facebook,
  Twitter,
  Instagram,
  Youtube
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-neutral-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-white text-3xl">
                <Book />
              </span>
              <span className="font-serif font-bold text-2xl">BiblioTech</span>
            </div>
            <p className="text-neutral-400 mb-4">
              Sua biblioteca digital completa, disponível quando e onde você quiser.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                <Youtube size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-serif font-bold text-lg mb-4">Explore</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/categorias" className="text-neutral-400 hover:text-white transition-colors">
                  Categorias
                </Link>
              </li>
              <li>
                <Link href="/autores" className="text-neutral-400 hover:text-white transition-colors">
                  Autores
                </Link>
              </li>
              <li>
                <Link href="/lancamentos" className="text-neutral-400 hover:text-white transition-colors">
                  Lançamentos
                </Link>
              </li>
              <li>
                <Link href="/mais-lidos" className="text-neutral-400 hover:text-white transition-colors">
                  Mais Lidos
                </Link>
              </li>
              <li>
                <Link href="/livros-gratuitos" className="text-neutral-400 hover:text-white transition-colors">
                  Livros Gratuitos
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif font-bold text-lg mb-4">Conta</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-neutral-400 hover:text-white transition-colors">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/cadastro" className="text-neutral-400 hover:text-white transition-colors">
                  Cadastrar
                </Link>
              </li>
              <li>
                <Link href="/perfil" className="text-neutral-400 hover:text-white transition-colors">
                  Meu Perfil
                </Link>
              </li>
              <li>
                <Link href="/favoritos" className="text-neutral-400 hover:text-white transition-colors">
                  Favoritos
                </Link>
              </li>
              <li>
                <Link href="/historico" className="text-neutral-400 hover:text-white transition-colors">
                  Histórico de Leitura
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-serif font-bold text-lg mb-4">Suporte</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/ajuda" className="text-neutral-400 hover:text-white transition-colors">
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <Link href="/contato" className="text-neutral-400 hover:text-white transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link href="/termos" className="text-neutral-400 hover:text-white transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-neutral-400 hover:text-white transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-neutral-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-neutral-700 mt-10 pt-6 text-center text-neutral-500 text-sm">
          <p>&copy; {new Date().getFullYear()} BiblioTech. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
