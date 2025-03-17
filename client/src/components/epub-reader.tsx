import { useState, useEffect, useRef } from "react";
import { Book } from "epubjs";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  Search, 
  Settings, 
  List, 
  BookOpen, 
  Bookmark,
  Home,
  ChevronFirst,
  ChevronLast,
  Palette,
  Sun,
  Moon,
  BookMarked,
  MoveLeft,
  Clock,
  TextSearch,
  RefreshCw,
  Sunrise as SunMoon
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

interface EPubReaderProps {
  url: string;
  bookId: number;
}

export default function EPubReader({ url, bookId }: EPubReaderProps) {
  console.log(`EPubReader inicializado - BookID: ${bookId}, URL: ${url}`);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Referência para armazenar funções de cleanup
    let cleanupFunctions: (() => void)[] = [];
    
    const initializeBook = async () => {
      try {
        // Determinar URL a usar (prioridade para URL direta, senão construir do ID)
        const fileUrl = url || `/api/books/view/${bookId}/epub`;
        console.log("EPubReader inicializado - BookID:", bookId, "URL:", url);
        console.log("Carregando EPUB de:", fileUrl);
        
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        const cacheBustUrl = `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
        console.log("URL com cache bust:", cacheBustUrl);
        
        // Correção para problemas de ResizeObserver
        // Silenciar erros de ResizeObserver
        const originalError = window.console.error;
        window.console.error = (...args: any[]) => {
          if (args[0]?.includes?.('ResizeObserver') || 
              (typeof args[0] === 'object' && args[0]?.message?.includes?.('ResizeObserver'))) {
            console.log("Erro de ResizeObserver ignorado:", args[0]);
            return;
          }
          originalError(...args);
        };
        
        // Adicionar função para restaurar o console.error original
        cleanupFunctions.push(() => {
          window.console.error = originalError;
        });
        
        // Opções avançadas para o leitor EPUB
        const bookOptions = {
          openAs: "epub",
          encoding: "binary",
          withCredentials: true,
          allowScriptedContent: true,  // Permitir conteúdo JavaScript no EPUB
        };
        
        console.log("Iniciando carregamento com opcões:", bookOptions);
        
        // Criar instância do livro EPUB
        const epubBook = new Book(cacheBustUrl, bookOptions);
        setBook(epubBook);

        // Adicionar função de cleanup para destruir o livro
        cleanupFunctions.push(() => {
          if (epubBook) {
            try {
              epubBook.destroy();
              console.log("Livro EPUB destruído com sucesso");
            } catch (e) {
              console.log("Erro ao destruir livro:", e);
            }
          }
        });

        // Aguardar o livro estar pronto
        console.log("Aguardando epubBook.ready...");
        await epubBook.ready;
        console.log("EPUB carregado com sucesso!");
        
        // Confirmar que temos um elemento container
        const container = viewerRef.current;
        if (!container) {
          throw new Error("Container element not found");
        }
        
        // Renderizar o livro no container com configurações otimizadas
        console.log("Criando renderização do EPUB...");
        const epubRendition = epubBook.renderTo(container, {
          width: "100%",
          height: "100%",
          spread: "none",  // Alterado para "none" para prevenir problemas
          flow: "scrolled-doc",  // Alterado para scrolled-doc para melhor navegação
          manager: "default",
          allowScriptedContent: true,
          stylesheet: "/epubStyles.css" // Arquivo de estilo opcional
        });
        
        // Configurar estilos adicionais para melhor leitura com fundo branco
        epubRendition.themes.register("default", {
          "body": {
            "font-family": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
            "font-size": "1.2em",
            "line-height": "1.5",
            "padding": "20px !important",
            "margin": "0 auto",
            "max-width": "800px",
            "background-color": "#ffffff !important",
            "color": "#000000 !important"
          },
          "html": {
            "background-color": "#ffffff !important"
          },
          "p": {
            "font-family": "inherit",
            "margin-bottom": "1em",
            "color": "#000000 !important"
          },
          "div": {
            "background-color": "#ffffff !important",
            "color": "#000000 !important"
          },
          "section": {
            "background-color": "#ffffff !important"
          },
          "img": {
            "max-width": "100% !important",
            "height": "auto !important",
            "display": "block",
            "margin": "1em auto"
          },
          "a": {
            "color": "#3b82f6 !important",
            "text-decoration": "underline"
          },
          "h1, h2, h3, h4, h5, h6": {
            "margin-top": "1.5em",
            "margin-bottom": "0.5em",
            "font-weight": "bold",
            "line-height": "1.2",
            "color": "#000000 !important"
          }
        });
        epubRendition.themes.select("default");
        
        // Definir fonte inicial
        epubRendition.themes.fontSize(`${fontSize}%`);
        
        // Exibir o conteúdo do livro
        console.log("Exibindo EPUB...");
        await epubRendition.display();
        console.log("EPUB exibido com sucesso");
        
        // Configurar eventos
        epubRendition.on("locationChanged", (location: any) => {
          console.log("Localização mudou:", location);
          if (location && location.start) {
            setCurrentLocation(location.start);
            try {
              const currentPage = epubBook.locations.percentageFromCfi(location.start);
              if (!isNaN(currentPage)) {
                setProgress(currentPage * 100);
                
                // Salvar progresso se o usuário estiver autenticado
                if (isAuthenticated && user) {
                  saveReadingProgress(Math.round(currentPage * 100));
                }
              }
            } catch (err) {
              console.error("Erro ao calcular percentual da página:", err);
            }
          }
        });

        epubRendition.on("rendered", (section: any) => {
          console.log("Seção renderizada:", section.href);
        });

        epubRendition.on("relocated", (location: any) => {
          console.log("Relocação:", location);
        });
        
        // Adicionar listeners para os botões de navegação via teclado
        const keyListener = (e: KeyboardEvent) => {
          // Esquerda (seta esquerda ou PageUp)
          if ((e.key === "ArrowLeft" || e.key === "PageUp") && epubRendition) {
            epubRendition.prev();
          }
          
          // Direita (seta direita ou PageDown)
          if ((e.key === "ArrowRight" || e.key === "PageDown") && epubRendition) {
            epubRendition.next();
          }
        };
        
        document.addEventListener("keyup", keyListener);
        cleanupFunctions.push(() => {
          document.removeEventListener("keyup", keyListener);
        });
        
        setRendition(epubRendition);

        // Obter o sumário
        console.log("Carregando navegação...");
        try {
          const navigation = await epubBook.loaded.navigation;
          console.log("Navegação carregada:", navigation);
          if (navigation && navigation.toc) {
            setToc(navigation.toc);
          }
        } catch (err) {
          console.error("Erro ao carregar navegação:", err);
        }

        // Gerar localizações para navegação precisa
        console.log("Gerando localizações...");
        try {
          await epubBook.locations.generate(1024);
          console.log("Localizações geradas com sucesso");
        } catch (err) {
          console.error("Erro ao gerar localizações:", err);
        }

      } catch (error) {
        console.error("Erro ao carregar o EPUB:", error);
        
        // Analisar o erro para fornecer mensagens mais específicas
        const errorStr = String(error);
        console.log("Detalhes do erro:", errorStr);
        
        if (errorStr.includes("empty_file") || 
            (errorStr.includes("404") && errorStr.includes("Arquivo sem conteúdo"))) {
          toast({
            title: "Arquivo vazio",
            description: "O arquivo EPUB existe, mas está vazio (0 bytes). Tente fazer o upload novamente.",
            variant: "destructive",
          });
        } else if (errorStr.includes("404") || errorStr.includes("not found")) {
          toast({
            title: "Arquivo não encontrado",
            description: "O arquivo EPUB deste livro não foi encontrado. Verifique se você fez o upload corretamente.",
            variant: "destructive",
          });
        } else if (errorStr.includes("Failed to fetch")) {
          toast({
            title: "Erro de conexão",
            description: "Não foi possível carregar o arquivo EPUB. Verifique sua conexão com a internet.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no leitor",
            description: "Não foi possível carregar o livro. Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
      }
    };

    // Verificar se o elemento container existe antes de inicializar
    if (viewerRef.current) {
      initializeBook();
    }

    // Cleanup function que executa todas as funções registradas
    return () => {
      console.log("Executando limpeza do componente EPubReader");
      cleanupFunctions.forEach(fn => fn());
      cleanupFunctions = [];
    };
  }, [url, isAuthenticated, user, bookId, fontSize]);

  const saveReadingProgress = async (progressValue: number) => {
    try {
      await apiRequest("POST", "/api/reading-history", {
        bookId,
        progress: progressValue,
        isCompleted: progressValue >= 100
      });
    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
    }
  };

  const handlePrevPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  const handleNextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };

  const handleProgressChange = (value: number[]) => {
    if (book && rendition) {
      const location = book.locations.cfiFromPercentage(value[0] / 100);
      rendition.display(location);
    }
  };

  const handleTocItemClick = (href: string) => {
    if (rendition) {
      rendition.display(href);
      setShowToc(false);
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    const newFontSize = value[0];
    setFontSize(newFontSize);
    
    if (rendition) {
      rendition.themes.fontSize(`${newFontSize}%`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Lidar com teclas do teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePrevPage();
          break;
        case "ArrowRight":
          handleNextPage();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rendition]);

  // Estados adicionais para incrementar a experiência
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');

  // Funções adicionais para nova UI
  const handleThemeChange = (newTheme: 'light' | 'sepia' | 'dark') => {
    if (!rendition) return;
    
    setTheme(newTheme);
    
    if (newTheme === 'light') {
      rendition.themes.register("default", {
        "body": {
          "background-color": "#ffffff !important",
          "color": "#000000 !important"
        },
        "html": { "background-color": "#ffffff !important" }
      });
    } else if (newTheme === 'sepia') {
      rendition.themes.register("default", {
        "body": {
          "background-color": "#f8f2e2 !important",
          "color": "#5b4636 !important"
        },
        "html": { "background-color": "#f8f2e2 !important" }
      });
    } else if (newTheme === 'dark') {
      rendition.themes.register("default", {
        "body": {
          "background-color": "#121212 !important",
          "color": "#e0e0e0 !important"
        },
        "html": { "background-color": "#121212 !important" },
        "p, h1, h2, h3, h4, h5, h6, div, span": {
          "color": "#e0e0e0 !important"
        },
        "a": { "color": "#90caf9 !important" }
      });
    }
    
    rendition.themes.select("default");
  };

  const handleSearch = () => {
    if (!book || !searchText.trim() || !rendition) return;
    
    book.ready.then(() => {
      const results: any[] = [];
      
      book.spine.each((section: any) => {
        if (section.load) {
          section.load(book.load.bind(book))
            .then((contents: any) => {
              const text = contents.textContent || '';
              const regex = new RegExp(searchText, 'gi');
              let match;
              
              while ((match = regex.exec(text)) !== null) {
                results.push({
                  cfi: section.cfiFromOffset(match.index),
                  excerpt: text.substring(
                    Math.max(0, match.index - 40),
                    Math.min(text.length, match.index + searchText.length + 40)
                  ),
                  section: section.href
                });
              }
              
              setSearchResults(results);
              if (results.length > 0) {
                rendition.display(results[0].cfi);
                setCurrentSearchIndex(0);
              }
            });
        }
      });
    });
  };

  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0 || !rendition) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    rendition.display(searchResults[newIndex].cfi);
  };

  const goToFirstPage = () => {
    if (book && rendition) {
      rendition.display(0);
    }
  };

  const goToLastPage = () => {
    if (book && rendition) {
      const lastPage = book.locations.length() - 1;
      if (lastPage >= 0) {
        const lastLocation = book.locations.cfiFromLocation(lastPage);
        rendition.display(lastLocation);
      }
    }
  };

  return (
    // Adicionado meta tag noindex para evitar indexação pelo Google
    <>
      <meta name="robots" content="noindex, nofollow" />
      
      <div className="flex flex-col h-full bg-white">
        {/* Nova Barra de Ferramentas Aprimorada */}
        <div className={`p-3 flex justify-between items-center ${
          theme === 'light' ? 'bg-blue-700 text-white' : 
          theme === 'sepia' ? 'bg-amber-800 text-white' :
          'bg-gray-900 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowToc(true)}
                    className={`${
                      theme === 'light' ? 'text-white hover:bg-blue-800' : 
                      theme === 'sepia' ? 'text-white hover:bg-amber-900' :
                      'text-white hover:bg-gray-800'
                    }`}
                  >
                    <Menu size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sumário e Configurações</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Link to={`/livros/${bookId}`}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${
                        theme === 'light' ? 'text-white hover:bg-blue-800' : 
                        theme === 'sepia' ? 'text-white hover:bg-amber-900' :
                        'text-white hover:bg-gray-800'
                      }`}
                    >
                      <MoveLeft size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Voltar para a página do livro</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
            
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="bg-white/20 text-white">
                {Math.round(progress)}%
              </Badge>
              
              {bookTitle && (
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {bookTitle}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearch(!showSearch)}
                    className={`${
                      theme === 'light' ? 'text-white hover:bg-blue-800' : 
                      theme === 'sepia' ? 'text-white hover:bg-amber-900' :
                      'text-white hover:bg-gray-800'
                    }`}
                  >
                    <Search size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pesquisar no livro</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const nextTheme = 
                        theme === 'light' ? 'sepia' : 
                        theme === 'sepia' ? 'dark' : 'light';
                      handleThemeChange(nextTheme);
                    }}
                    className={`${
                      theme === 'light' ? 'text-white hover:bg-blue-800' : 
                      theme === 'sepia' ? 'text-white hover:bg-amber-900' :
                      'text-white hover:bg-gray-800'
                    }`}
                  >
                    {theme === 'light' ? <Sun size={20} /> : 
                     theme === 'sepia' ? <SunMoon size={20} /> : 
                     <Moon size={20} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mudar tema ({theme === 'light' ? 'Claro' : theme === 'sepia' ? 'Sépia' : 'Escuro'})</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className={`${
                      theme === 'light' ? 'text-white hover:bg-blue-800' : 
                      theme === 'sepia' ? 'text-white hover:bg-amber-900' :
                      'text-white hover:bg-gray-800'
                    }`}
                  >
                    {isFullscreen ? <BookOpen size={20} /> : <Bookmark size={20} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Barra de Pesquisa */}
        {showSearch && (
          <div className={`p-3 flex items-center gap-2 ${
            theme === 'light' ? 'bg-blue-50 border-b border-blue-200' : 
            theme === 'sepia' ? 'bg-amber-50 border-b border-amber-200' : 
            'bg-gray-800 border-b border-gray-700'
          }`}>
            <input
              type="text"
              placeholder="Pesquisar no livro..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={`flex-1 px-3 py-1.5 rounded text-sm ${
                theme === 'light' ? 'bg-white border border-blue-200' : 
                theme === 'sepia' ? 'bg-amber-50 border border-amber-300' : 
                'bg-gray-700 border border-gray-600 text-white'
              }`}
            />
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSearch}
              className={`${
                theme === 'light' ? 'border-blue-300 hover:bg-blue-100' : 
                theme === 'sepia' ? 'border-amber-400 hover:bg-amber-100' : 
                'border-gray-600 bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <TextSearch size={16} className="mr-1" />
              Buscar
            </Button>
            
            {searchResults.length > 0 && (
              <>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => navigateSearchResults('prev')}
                  className={`${
                    theme === 'light' ? 'border-blue-300 hover:bg-blue-100' : 
                    theme === 'sepia' ? 'border-amber-400 hover:bg-amber-100' : 
                    'border-gray-600 bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <ChevronLeft size={16} />
                </Button>
                
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => navigateSearchResults('next')}
                  className={`${
                    theme === 'light' ? 'border-blue-300 hover:bg-blue-100' : 
                    theme === 'sepia' ? 'border-amber-400 hover:bg-amber-100' : 
                    'border-gray-600 bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <ChevronRight size={16} />
                </Button>
                
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-gray-300' : ''
                }`}>
                  {currentSearchIndex + 1} de {searchResults.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Container de Leitura Aprimorado */}
        <div className={`flex-grow relative overflow-hidden ${
          theme === 'light' ? 'bg-white' : 
          theme === 'sepia' ? 'bg-amber-50' : 
          'bg-gray-900'
        }`}>
          <div 
            ref={viewerRef} 
            className={`absolute inset-0 ${
              theme === 'light' ? 'bg-white' : 
              theme === 'sepia' ? 'bg-amber-50' : 
              'bg-gray-900'
            }`}
          />

          {/* Navegação por cliques nas laterais */}
          <div className="absolute inset-y-0 left-0 w-1/5 cursor-w-resize" onClick={handlePrevPage} />
          <div className="absolute inset-y-0 right-0 w-1/5 cursor-e-resize" onClick={handleNextPage} />

          {/* Botões de Navegação Aprimorados */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={`${
                      theme === 'light' ? 'bg-white/80 hover:bg-white' : 
                      theme === 'sepia' ? 'bg-amber-100/80 hover:bg-amber-100' : 
                      'bg-gray-800/80 hover:bg-gray-800 text-white'
                    } shadow-lg`}
                    onClick={goToFirstPage}
                  >
                    <ChevronFirst size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Primeira página</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={`${
                      theme === 'light' ? 'bg-white/80 hover:bg-white' : 
                      theme === 'sepia' ? 'bg-amber-100/80 hover:bg-amber-100' : 
                      'bg-gray-800/80 hover:bg-gray-800 text-white'
                    } shadow-lg`}
                    onClick={handlePrevPage}
                  >
                    <ChevronLeft size={24} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Página anterior</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={`${
                      theme === 'light' ? 'bg-white/80 hover:bg-white' : 
                      theme === 'sepia' ? 'bg-amber-100/80 hover:bg-amber-100' : 
                      'bg-gray-800/80 hover:bg-gray-800 text-white'
                    } shadow-lg`}
                    onClick={handleNextPage}
                  >
                    <ChevronRight size={24} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Próxima página</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={`${
                      theme === 'light' ? 'bg-white/80 hover:bg-white' : 
                      theme === 'sepia' ? 'bg-amber-100/80 hover:bg-amber-100' : 
                      'bg-gray-800/80 hover:bg-gray-800 text-white'
                    } shadow-lg`}
                    onClick={goToLastPage}
                  >
                    <ChevronLast size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Última página</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Barra de Progresso Aprimorada */}
        <div className={`p-3 ${
          theme === 'light' ? 'bg-blue-50 border-t border-blue-200' : 
          theme === 'sepia' ? 'bg-amber-100 border-t border-amber-200' : 
          'bg-gray-800 border-t border-gray-700'
        }`}>
          <Slider
            defaultValue={[0]}
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={handleProgressChange}
            className={`my-2 ${
              theme === 'dark' ? '[&_.absolute]:bg-gray-600 [&_[data-state=active]]:bg-gray-400' : ''
            }`}
          />
          <div className={`flex justify-between text-xs ${
            theme === 'light' ? 'text-blue-900' : 
            theme === 'sepia' ? 'text-amber-900' : 
            'text-gray-400'
          }`}>
            <span>Início</span>
            <span className="font-medium">{Math.round(progress)}% concluído</span>
            <span>Fim</span>
          </div>
        </div>

        {/* Drawer do Sumário Aprimorado */}
        <Sheet open={showToc} onOpenChange={setShowToc}>
          <SheetContent 
            side="left"
            className={`${
              theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 
              theme === 'sepia' ? 'bg-amber-50' : 
              ''
            }`}
          >
            <SheetHeader>
              <SheetTitle className={theme === 'dark' ? 'text-white' : ''}>
                Menu do Leitor
              </SheetTitle>
              <SheetClose className="absolute right-4 top-4">
                <X className={`h-4 w-4 ${theme === 'dark' ? 'text-white' : ''}`} />
                <span className="sr-only">Fechar</span>
              </SheetClose>
            </SheetHeader>

            <div className="mt-6">
              <Tabs defaultValue="contents">
                <TabsList className="w-full">
                  <TabsTrigger value="contents" className={theme === 'dark' ? 'data-[state=active]:bg-gray-700' : ''}>
                    <List className="h-4 w-4 mr-2" />
                    Sumário
                  </TabsTrigger>
                  <TabsTrigger value="settings" className={theme === 'dark' ? 'data-[state=active]:bg-gray-700' : ''}>
                    <Settings className="h-4 w-4 mr-2" />
                    Ajustes
                  </TabsTrigger>
                  <TabsTrigger value="bookmarks" className={theme === 'dark' ? 'data-[state=active]:bg-gray-700' : ''}>
                    <BookMarked className="h-4 w-4 mr-2" />
                    Marcadores
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="contents" className="mt-4 space-y-4">
                  <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : ''}`}>
                    Conteúdo do livro
                  </h3>
                  
                  <div className={`max-h-[60vh] overflow-y-auto ${
                    theme === 'dark' ? 'scrollbar-thin scrollbar-thumb-gray-700' : 
                    'scrollbar-thin scrollbar-thumb-gray-300'
                  }`}>
                    <ul className="space-y-1">
                      {toc.map((item, index) => (
                        <li key={index}>
                          <button
                            onClick={() => handleTocItemClick(item.href)}
                            className={`text-sm w-full text-left py-1.5 px-2 rounded ${
                              theme === 'light' ? 'hover:bg-blue-50' : 
                              theme === 'sepia' ? 'hover:bg-amber-100' : 
                              'hover:bg-gray-800'
                            }`}
                          >
                            {item.label}
                          </button>
                          {item.subitems && (
                            <ul className="pl-4 mt-1">
                              {item.subitems.map((subitem: any, subIndex: number) => (
                                <li key={subIndex}>
                                  <button
                                    onClick={() => handleTocItemClick(subitem.href)}
                                    className={`text-sm w-full text-left py-1.5 px-2 rounded ${
                                      theme === 'light' ? 'hover:bg-blue-50' : 
                                      theme === 'sepia' ? 'hover:bg-amber-100' : 
                                      'hover:bg-gray-800'
                                    }`}
                                  >
                                    {subitem.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="mt-4 space-y-4">
                  <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : ''}`}>
                    Tema de leitura
                  </h3>
                  
                  <div className="flex items-center justify-between gap-2 mb-6">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      className={`flex-1 ${
                        theme === 'dark' ? 'border-gray-700 bg-white text-black hover:bg-gray-100' : ''
                      }`}
                      onClick={() => handleThemeChange('light')}
                    >
                      <Sun className="h-4 w-4 mr-2" />
                      Claro
                    </Button>
                    
                    <Button
                      variant={theme === 'sepia' ? 'default' : 'outline'}
                      className={`flex-1 ${
                        theme === 'dark' ? 'border-gray-700 bg-amber-50 text-amber-900 hover:bg-amber-100' : ''
                      }`}
                      onClick={() => handleThemeChange('sepia')}
                    >
                      <SunMoon className="h-4 w-4 mr-2" />
                      Sépia
                    </Button>
                    
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      className={`flex-1 ${
                        theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : ''
                      }`}
                      onClick={() => handleThemeChange('dark')}
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Escuro
                    </Button>
                  </div>
                  
                  <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : ''}`}>
                    Tamanho da fonte
                  </h3>
                  
                  <div className="space-y-1.5">
                    <Slider
                      defaultValue={[100]}
                      value={[fontSize]}
                      min={50}
                      max={200}
                      step={10}
                      onValueChange={handleFontSizeChange}
                      className={`${
                        theme === 'dark' ? '[&_.absolute]:bg-gray-700 [&_[data-state=active]]:bg-gray-400' : ''
                      }`}
                    />
                    <div className={`flex justify-between text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span>A-</span>
                      <span>{fontSize}%</span>
                      <span>A+</span>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="bookmarks" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : ''}`}>
                      Marcadores salvos
                    </h3>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${
                        theme === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-white' : ''
                      }`}
                    >
                      <BookMarked className="h-4 w-4 mr-2" />
                      Marcar página atual
                    </Button>
                  </div>
                  
                  <div className={`rounded-lg p-6 text-center ${
                    theme === 'light' ? 'bg-blue-50' : 
                    theme === 'sepia' ? 'bg-amber-100' : 
                    'bg-gray-800'
                  }`}>
                    <Clock className={`h-10 w-10 mx-auto mb-3 ${
                      theme === 'light' ? 'text-blue-300' : 
                      theme === 'sepia' ? 'text-amber-400' : 
                      'text-gray-600'
                    }`} />
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : ''
                    }`}>
                      Você ainda não tem marcadores.
                      <br />
                      Marque páginas para encontrá-las facilmente depois.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 px-6">
              <Link to="/">
                <Button 
                  variant="outline" 
                  className={`w-full ${
                    theme === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-white' : ''
                  }`}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Voltar para Biblioteca
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
