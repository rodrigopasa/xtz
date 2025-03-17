import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { calculateReadingTime, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Book,
  FileText,
  Heart,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  FileDown,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

interface BookDetailProps {
  slug: string;
  authorSlug: string;
}

export default function BookDetail({ slug, authorSlug }: BookDetailProps) {
  const [, navigate] = useLocation();
  const [commentContent, setCommentContent] = useState("");
  const [rating, setRating] = useState(5);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  // Buscar detalhes do livro
  const { data: book, isLoading } = useQuery({
    queryKey: [`/api/books/${slug}`],
  });

  // Buscar comentários do livro
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: [`/api/books/${book?.id}/comments`],
    enabled: !!book?.id,
  });

  // Verificar se o livro está nos favoritos
  const { data: favoriteStatus } = useQuery({
    queryKey: [`/api/favorites/check/${book?.id}`],
    enabled: !!book?.id && isAuthenticated,
  });

  // Mutação para adicionar/remover favorito
  const favoriteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      if (favoriteStatus?.isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${bookId}`);
        return { isFavorite: false };
      } else {
        await apiRequest("POST", "/api/favorites", { bookId });
        return { isFavorite: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/favorites/check/${book?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });

      toast({
        title: favoriteStatus?.isFavorite
          ? "Removido dos favoritos"
          : "Adicionado aos favoritos",
        description: favoriteStatus?.isFavorite
          ? `${book?.title} foi removido dos seus favoritos.`
          : `${book?.title} foi adicionado aos seus favoritos.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os favoritos. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutação para adicionar comentário
  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/books/${book.id}/comments`, {
        content: commentContent,
        rating,
      });
    },
    onSuccess: () => {
      setCommentContent("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: [`/api/books/${book?.id}/comments`] });

      toast({
        title: "Comentário enviado",
        description: "Seu comentário foi adicionado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o comentário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutação para marcar comentário como útil
  const helpfulMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return apiRequest("POST", `/api/comments/${commentId}/helpful`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/books/${book?.id}/comments`] });
    },
  });

  // Rating mutation
  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      await apiRequest("POST", `/api/books/${book.id}/rate`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/books/${book?.id}`] });
      toast({
        title: "Avaliação enviada",
        description: "Sua avaliação foi registrada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível registrar sua avaliação. Tente novamente.",
        variant: "destructive",
      });
    },
  });


  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Não autenticado",
        description: "Faça login para adicionar este livro aos favoritos.",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate(book.id);
  };

  const handleDownload = async (format: string) => {
    if (!book) return;

    if (!isAuthenticated) {
      toast({
        title: "Não autenticado",
        description: "Faça login para fazer o download deste livro.",
        variant: "destructive",
      });
      return;
    }

    try {
      // URL para download do livro
      const downloadUrl = `/api/books/download/${book.id}/${format}`;

      // Abrir em uma nova aba para iniciar o download
      window.open(downloadUrl, "_blank");

      // Incrementar contador de downloads
      await apiRequest("POST", `/api/books/${book.id}/increment-downloads`);

      toast({
        title: "Download iniciado",
        description: `O download do livro em formato ${format.toUpperCase()} foi iniciado.`,
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível iniciar o download. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Não autenticado",
        description: "Faça login para adicionar comentários.",
        variant: "destructive",
      });
      return;
    }

    if (!commentContent.trim()) {
      toast({
        title: "Comentário vazio",
        description: "Por favor, escreva um comentário antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    commentMutation.mutate();
  };

  const handleHelpfulClick = (commentId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Não autenticado",
        description: "Faça login para marcar comentários como úteis.",
        variant: "destructive",
      });
      return;
    }

    helpfulMutation.mutate(commentId);
  };

  const handleReadOnline = (format: string) => {
    if (!book) return;

    if (!isAuthenticated) {
      toast({
        title: "Não autenticado",
        description: "Faça login para ler este livro online.",
        variant: "destructive",
      });
      return;
    }

    // Navegar para a página do leitor com o ID do livro e formato
    navigate(`/ler/${book.id}/${format}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3 lg:w-1/4">
            <Skeleton className="w-full aspect-[2/3] rounded-lg" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="md:w-2/3 lg:w-3/4 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <div className="flex flex-wrap gap-2 mb-6">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Livro não encontrado</h1>
        <p className="mb-6">O livro que você está procurando não existe ou foi removido.</p>
        <Button asChild>
          <Link href="/">Voltar para a página inicial</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-neutral-100 py-3">
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Início</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/categoria/${book.category.slug}`}>
                  {book.category.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/autor/${book.author.slug}`}>
                  {book.author.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="text-neutral-800 font-medium">{book.title}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Book Detail */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Book Cover */}
            <div className="md:w-1/3 lg:w-1/4">
              <div className="sticky top-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <img
                    src={book.coverUrl}
                    alt={`Capa do livro ${book.title}`}
                    className="w-full h-auto"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  {/* Só mostrar o botão de leitura online se houver pelo menos um formato disponível */}
                  {(book.pdfUrl || book.epubUrl) && (
                    <Button
                      className="flex items-center justify-center"
                      onClick={() => handleReadOnline(
                        // Priorizar o formato disponível, ou o primeiro se ambos estiverem disponíveis
                        book.epubUrl ? 'epub' : 'pdf'
                      )}
                    >
                      <Book className="mr-2" size={18} /> Ler online
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {book.pdfUrl && (
                      <Button
                        variant="outline"
                        className="flex items-center justify-center"
                        onClick={() => handleDownload('pdf')}
                      >
                        <FileText className="mr-2" size={18} /> PDF
                      </Button>
                    )}

                    {book.epubUrl && (
                      <Button
                        variant="outline"
                        className="flex items-center justify-center"
                        onClick={() => handleDownload('epub')}
                      >
                        <FileDown className="mr-2" size={18} /> EPUB
                      </Button>
                    )}
                  </div>

                  {book.amazonUrl && (
                    <Button
                      variant="secondary"
                      className="flex items-center justify-center"
                      onClick={() => window.open(book.amazonUrl, "_blank")}
                    >
                      <ExternalLink className="mr-2" size={18} /> Comprar na Amazon
                    </Button>
                  )}

                  <Button
                    variant={favoriteStatus?.isFavorite ? "default" : "outline"}
                    className={`flex items-center justify-center ${
                      favoriteStatus?.isFavorite ? "bg-secondary hover:bg-secondary-dark" : ""
                    }`}
                    onClick={handleFavoriteToggle}
                    disabled={favoriteMutation.isPending}
                  >
                    <Heart
                      className={`mr-2 ${favoriteStatus?.isFavorite ? "fill-current" : ""}`}
                      size={18}
                    />
                    {favoriteStatus?.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Book Info */}
            <div className="md:w-2/3 lg:w-3/4">
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">{book.title}</h1>
              <p className="text-xl text-neutral-600 mb-4">{book.author.name}</p>

              <div className="flex items-center mb-6">
                <div className="flex text-accent">
                  {[...Array(5)].map((_, index) => {
                    const starValue = index + 1;
                    return (
                      <svg
                        key={index}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={starValue <= book.rating ? "currentColor" : "none"}
                        stroke={starValue <= book.rating ? "none" : "currentColor"}
                        className="w-5 h-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                          clipRule="evenodd"
                        />
                      </svg>
                    );
                  })}
                </div>
                <span className="text-neutral-600 ml-2">{book.rating.toFixed(1)} ({book.ratingCount} avaliações)</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <span className="bg-neutral-100 text-neutral-800 text-sm py-1 px-3 rounded-full">
                  {book.category.name}
                </span>
                {book.language && (
                  <span className="bg-neutral-100 text-neutral-800 text-sm py-1 px-3 rounded-full">
                    {book.language === 'pt-BR' ? 'Português do Brasil' : book.language}
                  </span>
                )}
                {book.pageCount && (
                  <span className="bg-neutral-100 text-neutral-800 text-sm py-1 px-3 rounded-full">
                    {calculateReadingTime(book.pageCount)}
                  </span>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="font-serif text-xl font-bold mb-4">Sobre o livro</h2>
                <p className="text-neutral-600 whitespace-pre-line">
                  {book.description}
                </p>
              </div>

              {/* Tabs Navigation */}
              <Tabs defaultValue="details">
                <TabsList className="mb-6">
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="comments">
                    Comentários ({comments.length})
                  </TabsTrigger>
                </TabsList>

                {/* Book Details */}
                <TabsContent value="details" className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="font-serif text-xl font-bold mb-4">Informações do livro</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <ul className="space-y-3">
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Título:</span>
                            <span className="text-neutral-600">{book.title}</span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Autor:</span>
                            <span className="text-neutral-600">{book.author.name}</span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Série:</span>
                            <span className="text-neutral-600">
                              {book.series ? (
                                <>
                                  {book.series.name}
                                  {book.volumeNumber ? ` - Volume ${book.volumeNumber}` : ''}
                                </>
                              ) : 'Não faz parte de uma série'}
                            </span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Editora:</span>
                            <span className="text-neutral-600">{book.publisher || 'Não informado'}</span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Ano:</span>
                            <span className="text-neutral-600">{book.publishYear || 'Não informado'}</span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Idioma:</span>
                            <span className="text-neutral-600">
                              {book.language === 'pt-BR' ? 'Português (Brasil)' : book.language}
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <ul className="space-y-3">
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Páginas:</span>
                            <span className="text-neutral-600">{book.pageCount || 'Não informado'}</span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">ISBN:</span>
                            <span className="text-neutral-600">{book.isbn || 'Não informado'}</span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Categoria:</span>
                            <span className="text-neutral-600">{book.category.name}</span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Formato:</span>
                            <span className="text-neutral-600">
                              {book.format === 'epub' ? 'EPUB' :
                                book.format === 'pdf' ? 'PDF' : 'EPUB, PDF'}
                            </span>
                          </li>
                          <li className="flex">
                            <span className="font-medium w-28 text-neutral-800">Downloads:</span>
                            <span className="text-neutral-600">{book.downloadCount}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Comments Section */}
                <TabsContent value="comments" className="space-y-8">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    {isAuthenticated && (
                      <div className="mb-8">
                        <h3 className="font-serif text-lg font-bold mb-4">Deixe seu comentário</h3>
                        <form onSubmit={handleCommentSubmit}>
                          <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Sua avaliação</label>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    setRating(star);
                                    if (isAuthenticated) {
                                      ratingMutation.mutate(star);
                                    } else {
                                      toast({
                                        title: "Não autenticado",
                                        description: "Faça login para avaliar este livro.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="text-2xl focus:outline-none"
                                  disabled={ratingMutation.isPending}
                                >
                                  <span
                                    className={`text-2xl transition-colors ${
                                      rating >= star ? 'text-accent' : 'text-neutral-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                </button>
                              ))}
                              {ratingMutation.isPending && (
                                <span className="text-sm text-neutral-500 ml-2">
                                  Enviando avaliação...
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mb-4">
                            <label htmlFor="comment" className="block text-sm font-medium mb-2">
                              Seu comentário
                            </label>
                            <Textarea
                              id="comment"
                              placeholder="Compartilhe sua opinião sobre este livro..."
                              value={commentContent}
                              onChange={(e) => setCommentContent(e.target.value)}
                              rows={4}
                              required
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={commentMutation.isPending}
                          >
                            {commentMutation.isPending ? "Enviando..." : "Enviar comentário"}
                          </Button>
                        </form>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-xl font-bold">Comentários dos leitores</h3>
                      </div>

                      {commentsLoading ? (
                        <div className="space-y-6">
                          {[1, 2].map((i) => (
                            <div key={i} className="border-b border-neutral-200 pb-6">
                              <div className="flex items-start">
                                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                                <div className="flex-grow">
                                  <div className="flex justify-between items-center mb-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                  </div>
                                  <Skeleton className="h-4 w-24 mb-3" />
                                  <Skeleton className="h-4 w-full mb-2" />
                                  <Skeleton className="h-4 w-full mb-2" />
                                  <Skeleton className="h-4 w-3/4 mb-3" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : comments.length > 0 ? (
                        <div className="space-y-6">
                          {comments.map((comment: any) => (
                            <div key={comment.id} className="border-b border-neutral-200 pb-6 mb-6">
                              <div className="flex items-start">
                                <Avatar className="w-12 h-12 mr-4">
                                  <AvatarImage src={comment.user?.avatarUrl} alt={comment.user?.name} />
                                  <AvatarFallback>
                                    {comment.user?.name.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-grow">
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium">{comment.user?.name}</h4>
                                    <span className="text-neutral-500 text-sm">
                                      {formatDate(comment.createdAt)}
                                    </span>
                                  </div>

                                  <div className="flex text-accent mb-3">
                                    {[...Array(5)].map((_, index) => (
                                      <span key={index} className="text-lg">
                                        {index < comment.rating ? "★" : "☆"}
                                      </span>
                                    ))}
                                  </div>

                                  <p className="text-neutral-600 mb-3 whitespace-pre-line">
                                    {comment.content}
                                  </p>

                                  <div className="flex items-center space-x-4 text-sm">
                                    <button
                                      className="text-neutral-500 hover:text-neutral-700 flex items-center"
                                      onClick={() => handleHelpfulClick(comment.id)}
                                      disabled={helpfulMutation.isPending}
                                    >
                                      <ThumbsUp size={16} className="mr-1" />
                                      Útil ({comment.helpfulCount})
                                    </button>
                                    <button className="text-neutral-500 hover:text-neutral-700 flex items-center">
                                      <MessageSquare size={16} className="mr-1" /> Responder
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-neutral-500">
                            Ainda não há comentários para este livro. Seja o primeiro a comentar!
                          </p>
                          {!isAuthenticated && (
                            <Button asChild className="mt-4">
                              <Link href="/login">
                                Faça login para comentar <ArrowRight className="ml-2" size={16} />
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}