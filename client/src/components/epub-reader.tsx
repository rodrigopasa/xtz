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
    if (!url || !viewerRef.current) return;

    const initializeBook = async () => {
      try {
        const epubBook = new Book(url);
        setBook(epubBook);

        await epubBook.ready;

        const epubRendition = epubBook.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          spread: "auto",
        });

        await epubRendition.display();

        epubRendition.on("locationChanged", (location: any) => {
          setCurrentLocation(location.start);
          const currentPage = epubBook.locations.percentageFromCfi(location.start);
          setProgress(currentPage * 100);
          
          // Salvar progresso se o usuário estiver autenticado
          if (isAuthenticated && user) {
            saveReadingProgress(Math.round(currentPage * 100));
          }
        });

        setRendition(epubRendition);

        // Obter o sumário
        const navigation = await epubBook.loaded.navigation;
        setToc(navigation.toc);

        // Gerar localizações para navegação precisa
        await epubBook.locations.generate(1024);

      } catch (error) {
        console.error("Erro ao carregar o EPUB:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o livro. Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    };

    initializeBook();

    return () => {
      if (book) {
        book.destroy();
      }
    };
  }, [url, isAuthenticated, user]);

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
