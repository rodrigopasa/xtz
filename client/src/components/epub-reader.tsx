import { useState, useEffect, useRef } from "react";
import { Book } from "epubjs";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  Search, 
  Settings, 
  List, 
  BookOpen, 
  Bookmark 
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

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
        
        // Configurar estilos adicionais para melhor leitura
        epubRendition.themes.register("default", {
          "body": {
            "font-family": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
            "font-size": "1.2em",
            "line-height": "1.5",
            "padding": "20px !important",
            "margin": "0 auto",
            "max-width": "800px"
          },
          "p": {
            "font-family": "inherit",
            "margin-bottom": "1em"
          },
          "img": {
            "max-width": "100% !important",
            "height": "auto !important",
            "display": "block",
            "margin": "1em auto"
          },
          "a": {
            "color": "#3b82f6",
            "text-decoration": "underline"
          },
          "h1, h2, h3, h4, h5, h6": {
            "margin-top": "1.5em",
            "margin-bottom": "0.5em",
            "font-weight": "bold",
            "line-height": "1.2"
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Barra de Ferramentas */}
      <div className="bg-neutral-800 text-white p-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowToc(true)}
            className="text-white hover:bg-neutral-700"
          >
            <Menu size={20} />
          </Button>
          <span className="text-sm hidden md:inline-block">
            Progresso: {Math.round(progress)}%
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-neutral-700"
          >
            {isFullscreen ? <BookOpen size={20} /> : <Bookmark size={20} />}
          </Button>
        </div>
      </div>

      {/* Container de Leitura */}
      <div className="flex-grow relative overflow-hidden">
        <div 
          ref={viewerRef} 
          className="absolute inset-0 bg-neutral-50"
        />

        {/* Navegação por cliques nas laterais */}
        <div className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" onClick={handlePrevPage} />
        <div className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize" onClick={handleNextPage} />

        {/* Botões de Navegação */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg"
          onClick={handlePrevPage}
        >
          <ChevronLeft size={24} />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg"
          onClick={handleNextPage}
        >
          <ChevronRight size={24} />
        </Button>
      </div>

      {/* Barra de Progresso */}
      <div className="p-3 bg-neutral-100 border-t border-neutral-200">
        <Slider
          defaultValue={[0]}
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleProgressChange}
          className="my-2"
        />
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Início</span>
          <span>Fim</span>
        </div>
      </div>

      {/* Drawer do Sumário */}
      <Sheet open={showToc} onOpenChange={setShowToc}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Sumário</SheetTitle>
            <SheetClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </SheetClose>
          </SheetHeader>

          <div className="mt-6 space-y-2">
            {/* Controle de Tamanho da Fonte */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Tamanho da fonte</h3>
              <Slider
                defaultValue={[100]}
                value={[fontSize]}
                min={50}
                max={200}
                step={10}
                onValueChange={handleFontSizeChange}
              />
              <div className="flex justify-between text-xs text-neutral-500">
                <span>A-</span>
                <span>A+</span>
              </div>
            </div>

            {/* Sumário */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Sumário</h3>
              <ul className="space-y-1">
                {toc.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleTocItemClick(item.href)}
                      className="text-sm w-full text-left py-1.5 px-2 hover:bg-neutral-100 rounded"
                    >
                      {item.label}
                    </button>
                    {item.subitems && (
                      <ul className="pl-4 mt-1">
                        {item.subitems.map((subitem: any, subIndex: number) => (
                          <li key={subIndex}>
                            <button
                              onClick={() => handleTocItemClick(subitem.href)}
                              className="text-sm w-full text-left py-1.5 px-2 hover:bg-neutral-100 rounded"
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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
