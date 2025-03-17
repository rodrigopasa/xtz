import { useState, useEffect, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  BookOpen 
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

// Garantir que o worker do PDF.js esteja carregado
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFReaderProps {
  url: string;
  bookId: number;
}

export default function PDFReader({ url, bookId }: PDFReaderProps) {
  console.log(`PDFReader inicializado - BookID: ${bookId}, URL: ${url}`);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [outline, setOutline] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const loadPDF = async () => {
      try {
        // Usar a rota de visualização para carregar o PDF
        const viewUrl = `/api/books/view/${bookId}/pdf`;
        console.log("Carregando PDF de:", viewUrl);
        
        // Adicionar timestamp para evitar cache
        const urlWithTimestamp = `${viewUrl}?t=${new Date().getTime()}`;
        
        const loadingTask = pdfjs.getDocument(urlWithTimestamp);
        const pdfDocument = await loadingTask.promise;
        
        setPdf(pdfDocument);
        setNumPages(pdfDocument.numPages);
        
        // Carregar o outline (sumário)
        const outlineItems = await pdfDocument.getOutline();
        if (outlineItems) {
          setOutline(outlineItems);
        }
        
        // Registrar o início da leitura
        if (isAuthenticated && user) {
          saveReadingProgress(Math.round((currentPage / pdfDocument.numPages) * 100));
        }
      } catch (error) {
        console.error("Erro ao carregar o PDF:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o PDF. Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    };

    loadPDF();
  }, [url, isAuthenticated, user]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale, rotation: rotation });
        
        const canvas = canvasRef.current;
        if (!canvas) {
          console.error("Canvas element not found");
          return;
        }
        
        const context = canvas.getContext("2d");
        if (!context) {
          console.error("Could not get 2D context from canvas");
          return;
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });
        
        await renderTask.promise;
        
        // Atualizar progresso de leitura
        if (isAuthenticated && user) {
          saveReadingProgress(Math.round((currentPage / numPages) * 100));
        }
      } catch (error) {
        console.error("Erro ao renderizar página:", error);
      }
    };

    renderPage();
  }, [pdf, currentPage, scale, rotation, numPages, isAuthenticated, user]);

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
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageChange = (value: number[]) => {
    const page = Math.round(value[0]);
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.6));
  };

  const handleRotate = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleBookmark = () => {
    if (bookmarks.includes(currentPage)) {
      setBookmarks(bookmarks.filter(page => page !== currentPage));
      toast({
        title: "Marcador removido",
        description: `Página ${currentPage} removida dos marcadores.`
      });
    } else {
      setBookmarks([...bookmarks, currentPage]);
      toast({
        title: "Marcador adicionado",
        description: `Página ${currentPage} adicionada aos marcadores.`
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePrevPage();
          break;
        case "ArrowRight":
          handleNextPage();
          break;
        case "+":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPage, numPages]);

  return (
    <div className="flex flex-col h-full bg-neutral-800">
      {/* Barra de Ferramentas */}
      <div className="bg-neutral-800 text-white p-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(true)}
            className="text-white hover:bg-neutral-700"
          >
            <Menu size={20} />
          </Button>
          <span className="text-sm">
            {currentPage} / {numPages}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="text-white hover:bg-neutral-700"
          >
            <ZoomOut size={20} />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="text-white hover:bg-neutral-700"
          >
            <ZoomIn size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            className="text-white hover:bg-neutral-700"
          >
            <RotateCw size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-neutral-700"
          >
            <BookOpen size={20} />
          </Button>
        </div>
      </div>

      {/* Container de Visualização */}
      <div className="flex-grow overflow-auto bg-neutral-900 flex items-center justify-center">
        <div className="relative p-4">
          <canvas ref={canvasRef} className="mx-auto shadow-lg bg-white" />
        </div>
      </div>

      {/* Barra de Navegação */}
      <div className="p-3 bg-neutral-800 border-t border-neutral-700 flex items-center space-x-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="bg-neutral-700 hover:bg-neutral-600 text-white"
        >
          <ChevronLeft size={18} />
        </Button>
        
        <div className="flex-grow px-4">
          <Slider
            value={[currentPage]}
            min={1}
            max={numPages}
            step={1}
            onValueChange={handlePageChange}
            className="my-2"
          />
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage >= numPages}
          className="bg-neutral-700 hover:bg-neutral-600 text-white"
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Sidebar */}
      <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>PDF Navigator</SheetTitle>
            <SheetClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </SheetClose>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Sumário */}
            {outline.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sumário</h3>
                <ul className="space-y-1">
                  {outline.map((item, index) => (
                    <li key={index}>
                      <button
                        onClick={async () => {
                          try {
                            const dest = await pdf.getDestination(item.dest);
                            const pageIndex = await pdf.getPageIndex(dest[0]);
                            setCurrentPage(pageIndex + 1);
                            setShowSidebar(false);
                          } catch (error) {
                            console.error("Erro ao navegar para destino:", error);
                          }
                        }}
                        className="text-sm w-full text-left py-1.5 px-2 hover:bg-neutral-100 rounded"
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Marcadores */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Marcadores</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleBookmark}
                >
                  {bookmarks.includes(currentPage) ? "Remover marcador" : "Adicionar marcador"}
                </Button>
              </div>
              
              {bookmarks.length > 0 ? (
                <ul className="space-y-1">
                  {bookmarks.sort((a, b) => a - b).map((page) => (
                    <li key={page}>
                      <button
                        onClick={() => {
                          setCurrentPage(page);
                          setShowSidebar(false);
                        }}
                        className="text-sm w-full text-left py-1.5 px-2 hover:bg-neutral-100 rounded flex justify-between items-center"
                      >
                        <span>Página {page}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookmarks(bookmarks.filter(p => p !== page));
                          }}
                        >
                          <X size={14} />
                        </Button>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">Nenhum marcador adicionado.</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
