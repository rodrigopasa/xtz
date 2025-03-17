import { useState, useEffect, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  BookOpen,
  Bookmark,
  Home,
  ChevronFirst,
  ChevronLast,
  FileText,
  RotateCcw,
  MoveLeft,
  Search
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
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

// Configurar PDF.js para usar um worker fake quando o worker real não está disponível
// Isso garante que o PDF.js funcionará mesmo sem acesso ao worker externo
console.log("Versão do PDF.js:", pdfjs.version);
try {
  // Tenta configurar o worker normal
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    `../../../node_modules/pdfjs-dist/build/pdf.worker.min.js`,
    import.meta.url
  ).toString();
} catch (error) {
  console.log("Usando worker fake devido a erro:", error);
  // Fallback para worker fake (mais lento, mas funciona sem dependências externas)
  pdfjs.GlobalWorkerOptions.workerSrc = '';
  // Configuração alternativa para usar worker fake
  // Não podemos modificar importações diretamente
  (window as any).PDFJS_DISABLE_WORKER = true;
}

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
        
        // Analisar o erro para fornecer mensagens mais específicas
        const errorStr = String(error);
        console.log("Detalhes do erro:", errorStr);
        
        if (errorStr.includes("empty_file") || 
            (errorStr.includes("404") && errorStr.includes("Arquivo sem conteúdo"))) {
          toast({
            title: "Arquivo vazio",
            description: "O arquivo PDF existe, mas está vazio (0 bytes). Esta é uma limitação do ambiente de demonstração.",
            variant: "destructive",
          });
        } else if (errorStr.includes("404") || errorStr.includes("not found")) {
          toast({
            title: "Arquivo não encontrado",
            description: "O arquivo PDF deste livro não está disponível no servidor. Estamos usando um banco de dados com arquivos de exemplo.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível carregar o PDF. Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
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
    // Adicionado meta tag noindex para evitar indexação pelo Google
    <>
      <meta name="robots" content="noindex, nofollow" />
      
      <div className="flex flex-col h-full bg-neutral-800">
        {/* Barra de Ferramentas Aprimorada */}
        <div className="bg-blue-700 text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(true)}
                    className="text-white hover:bg-blue-800"
                  >
                    <Menu size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sumário e Marcadores</p>
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
                      className="text-white hover:bg-blue-800"
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
                Página {currentPage} de {numPages}
              </Badge>
              
              <Badge variant="outline" className="bg-white/20 text-white">
                {Math.round((currentPage / numPages) * 100)}%
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    className="text-white hover:bg-blue-800"
                  >
                    <ZoomOut size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Diminuir zoom</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <span className="text-sm font-medium hidden sm:inline-block">
              {Math.round(scale * 100)}%
            </span>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    className="text-white hover:bg-blue-800"
                  >
                    <ZoomIn size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Aumentar zoom</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRotate}
                    className="text-white hover:bg-blue-800"
                  >
                    <RotateCw size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Girar página</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleBookmark}
                    className="text-white hover:bg-blue-800"
                  >
                    <Bookmark size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{bookmarks.includes(currentPage) ? "Remover marcador" : "Adicionar marcador"}</p>
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
                    className="text-white hover:bg-blue-800"
                  >
                    <BookOpen size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullscreen ? "Sair da tela cheia" : "Tela cheia"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Container de Visualização Aprimorado */}
        <div className="flex-grow overflow-auto bg-gray-900 flex items-center justify-center">
          <div className="relative p-4">
            <canvas ref={canvasRef} className="mx-auto shadow-xl bg-white rounded-sm" />
            
            {/* Indicador de Página Atual */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full shadow-lg">
              <Badge variant="secondary" className="bg-blue-700 text-white hover:bg-blue-800">
                {currentPage}
              </Badge>
              <span className="text-sm font-medium">de {numPages}</span>
            </div>
            
            {/* Botões de Navegação Aprimorados */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="bg-white/80 hover:bg-white shadow-lg"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage <= 1}
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
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1}
                      className="bg-white/80 hover:bg-white shadow-lg"
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
                      onClick={handleNextPage}
                      disabled={currentPage >= numPages}
                      className="bg-white/80 hover:bg-white shadow-lg"
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
                      className="bg-white/80 hover:bg-white shadow-lg"
                      onClick={() => setCurrentPage(numPages)}
                      disabled={currentPage >= numPages}
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
        </div>

        {/* Barra de Navegação Aprimorada */}
        <div className="p-3 bg-blue-50 border-t border-blue-200 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="border-blue-300 hover:bg-blue-100"
          >
            <ChevronLeft size={18} className="mr-1" />
            Anterior
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
            <div className="flex justify-between text-xs text-blue-900">
              <span>1</span>
              <span>Arraste para navegar</span>
              <span>{numPages}</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="border-blue-300 hover:bg-blue-100"
          >
            Próxima
            <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>

        {/* Sidebar Aprimorada */}
        <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Navegador do PDF</SheetTitle>
              <SheetClose className="absolute right-4 top-4">
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </SheetClose>
            </SheetHeader>

            <div className="mt-6">
              <Tabs defaultValue="contents">
                <TabsList className="w-full">
                  <TabsTrigger value="contents">
                    <FileText className="h-4 w-4 mr-2" />
                    Sumário
                  </TabsTrigger>
                  <TabsTrigger value="bookmarks">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Marcadores
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="contents" className="mt-4 space-y-4">
                  {outline.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto">
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
                              className="text-sm w-full text-left py-1.5 px-2 hover:bg-blue-50 rounded"
                            >
                              {item.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg p-6 text-center bg-gray-100">
                      <Search className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Este PDF não possui sumário estruturado.
                        <br />
                        Use a barra de navegação para ir para páginas específicas.
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="bookmarks" className="mt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Meus marcadores</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleBookmark}
                      className="border-blue-300 hover:bg-blue-50"
                    >
                      {bookmarks.includes(currentPage) ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Remover
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-4 w-4 mr-2" />
                          Marcar
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {bookmarks.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto">
                      <ul className="space-y-1">
                        {bookmarks.sort((a, b) => a - b).map((page) => (
                          <li key={page}>
                            <button
                              onClick={() => {
                                setCurrentPage(page);
                                setShowSidebar(false);
                              }}
                              className="text-sm w-full text-left py-1.5 px-2 hover:bg-blue-50 rounded flex justify-between items-center"
                            >
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2 bg-blue-100">
                                  {page}
                                </Badge>
                                <span>Página {page}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBookmarks(bookmarks.filter(p => p !== page));
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                              >
                                <X size={14} />
                              </Button>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg p-6 text-center bg-gray-100">
                      <Bookmark className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Você ainda não tem marcadores.
                        <br />
                        Marque páginas para encontrá-las facilmente depois.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 px-6">
              <Link to="/">
                <Button variant="outline" className="w-full">
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
