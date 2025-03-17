import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Book, ArrowLeft, BookOpen, Download, ExternalLink } from "lucide-react";
import EPubReader from "@/components/epub-reader";
import PDFReader from "@/components/pdf-reader";

interface ReaderProps {
  id: number;
  format: string;
}

export default function Reader({ id, format }: ReaderProps) {
  console.log(`Página Reader carregada - ID: ${id}, Formato: ${format}`);
  
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [previousReading, setPreviousReading] = useState<number | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  
  // Verificar formato válido
  const isValidFormat = format === 'epub' || format === 'pdf';
  console.log(`Formato válido: ${isValidFormat}`);
  
  // Definindo o tipo para o livro
  interface Book {
    id: number;
    title: string;
    slug: string;
    epubUrl?: string;
    pdfUrl?: string;
    format: 'epub' | 'pdf' | 'both';
    coverUrl?: string;
    series?: {
      name: string;
      volume: number;
      slug: string;
    } | null;
    author: {
      name: string;
      slug: string;
    };
  }
  
  // Carregar informações do livro - tentativa com ID numérico
  const { data: book, isLoading, error } = useQuery<Book>({
    queryKey: [`/api/books/${id}`],
    retry: 1,
    retryDelay: 1000
  });
  
  useEffect(() => {
    if (!book) return;
    
    // Verificar disponibilidade do formato selecionado
    const hasRequestedFormat = 
      (format === 'epub' && book.epubUrl) || 
      (format === 'pdf' && book.pdfUrl);
    
    // Verificar formato alternativo disponível
    const hasAlternativeFormat = 
      (format === 'epub' && !book.epubUrl && book.pdfUrl) || 
      (format === 'pdf' && !book.pdfUrl && book.epubUrl);

    if (hasRequestedFormat) {
      // O formato solicitado está disponível
      const requestedUrl = format === 'epub' ? book.epubUrl : book.pdfUrl;
      if (requestedUrl) setFileUrl(requestedUrl);
    } else if (hasAlternativeFormat) {
      // Usar formato alternativo
      const alternativeFormat = format === 'epub' ? 'PDF' : 'EPUB';
      const alternativeUrl = format === 'epub' ? book.pdfUrl : book.epubUrl;
      
      if (alternativeUrl) setFileUrl(alternativeUrl);
      toast({
        title: `${format.toUpperCase()} não disponível`,
        description: `O formato ${format.toUpperCase()} não está disponível para este livro. Exibindo em ${alternativeFormat}.`,
        variant: "default",
      });
    } else {
      // Nenhum formato disponível
      toast({
        title: "Formato não disponível",
        description: "Este livro não está disponível no formato solicitado.",
        variant: "destructive",
      });
    }
  }, [book, format, toast]);
  
  // Mostrar mensagem de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-48 mx-auto mb-8" />
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
          <p className="mt-4 text-neutral-600">Carregando o leitor, por favor aguarde...</p>
        </div>
      </div>
    );
  }
  
  // Mostrar mensagem de erro
  if (error || !isValidFormat || (!isLoading && !book)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">
            {!isValidFormat ? "Formato inválido" : "Erro ao carregar o livro"}
          </h2>
          <p className="text-neutral-600 mb-6">
            {!isValidFormat 
              ? "O formato solicitado não é válido. Por favor, escolha entre EPUB ou PDF."
              : "Não foi possível carregar o livro solicitado. Verifique se o livro existe e está disponível."}
          </p>
          <Button asChild>
            <Link href="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Para facilitar os testes, estamos permitindo acesso ao leitor sem autenticação
  // Comentando o código de verificação de autenticação por enquanto
  /*
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">Autenticação necessária</h2>
          <p className="text-neutral-600 mb-6">
            Você precisa estar logado para acessar o leitor. Por favor, faça login ou crie uma conta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/login">Fazer login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  */
  
  // Mostrar mensagem se nenhum formato estiver disponível
  if (!fileUrl && book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">
            Formato não disponível
          </h2>
          <p className="text-neutral-600 mb-6">
            Este livro não está disponível no formato solicitado. Por favor, tente outro formato ou escolha outro livro.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href={`/livro/${book.slug}/${book.author.slug}`}>Voltar para o livro</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Ir para a página inicial</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Renderizar o leitor apropriado com meta noindex
  return (
    <>
      <Helmet>
        <title>{book?.title ? `Lendo: ${book.title}` : 'Leitor de livros'}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Leitor de livros interativo" />
      </Helmet>
      
      {/* Barra superior com informações do livro */}
      <div className="bg-white border-b shadow-sm py-2 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href={`/livro/${book?.slug}/${book?.author.slug}`}>
              <Button variant="ghost" size="sm" className="text-blue-600">
                <ArrowLeft size={18} className="mr-1" />
                Voltar
              </Button>
            </Link>
            
            <div className="hidden md:block">
              <span className="text-sm font-medium">{book?.title}</span>
              {book?.series && (
                <Badge variant="outline" className="ml-2">
                  Série: {book.series.name} #{book.series.volume}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {book?.format === 'both' && (
              <Link href={`/ler/${id}/${format === 'epub' ? 'pdf' : 'epub'}`}>
                <Button variant="outline" size="sm">
                  <BookOpen size={16} className="mr-1" />
                  Ver em {format === 'epub' ? 'PDF' : 'EPUB'}
                </Button>
              </Link>
            )}
            
            <Link href={format === 'epub' ? `/api/books/download/${id}/epub` : `/api/books/download/${id}/pdf`} target="_blank">
              <Button variant="outline" size="sm">
                <Download size={16} className="mr-1" />
                Download
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Container do leitor */}
      <div className="h-[calc(100vh-110px)]">
        {format === 'epub' || fileUrl?.endsWith('.epub') ? (
          <EPubReader url={fileUrl || ""} bookId={id} />
        ) : (
          <PDFReader url={fileUrl || ""} bookId={id} />
        )}
      </div>
    </>
  );
}
