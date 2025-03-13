import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart, FileDown, Book, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserFavorites() {
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar livros favoritos
  const { data: favoriteBooks, isLoading } = useQuery({
    queryKey: ["/api/favorites"],
  });

  // Mutação para remover dos favoritos
  const removeFavoriteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      return await apiRequest("DELETE", `/api/favorites/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Removido dos favoritos",
        description: "O livro foi removido da sua lista de favoritos.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover dos favoritos. Tente novamente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRemoving(null);
    },
  });

  const handleRemoveFromFavorites = (bookId: number) => {
    setIsRemoving(bookId);
    removeFavoriteMutation.mutate(bookId);
  };

  const handleDownload = async (bookId: number, format: string) => {
    try {
      const response = await apiRequest("GET", `/api/books/${bookId}/download/${format}`);
      
      if (response.url) {
        window.open(response.url, "_blank");
      }
      
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

  return (
    <main className="flex-grow p-6 bg-neutral-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl font-bold mb-6">Meus Favoritos</h1>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array(4).fill(0).map((_, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex">
                    <Skeleton className="w-24 h-36 rounded mr-4" />
                    <div className="flex-1">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favoriteBooks?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {favoriteBooks.map((book: any) => (
              <Card key={book.id}>
                <CardContent className="p-6">
                  <div className="flex">
                    <Link href={`/livro/${book.slug}/${book.author.slug}`} className="block shrink-0">
                      <img 
                        src={book.coverUrl}
                        alt={`Capa do livro ${book.title}`}
                        className="w-24 h-36 object-cover rounded"
                      />
                    </Link>
                    <div className="ml-4 flex-1">
                      <Link href={`/livro/${book.slug}/${book.author.slug}`}>
                        <h2 className="font-serif font-bold text-lg mb-1 hover:text-primary">
                          {book.title}
                        </h2>
                      </Link>
                      <p className="text-neutral-600 text-sm mb-2">{book.author.name}</p>
                      <p className="text-neutral-500 text-sm line-clamp-3 mb-3">
                        {book.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild 
                          className="text-xs flex items-center"
                        >
                          <Link href={`/livro/${book.slug}/${book.author.slug}`}>
                            <Book className="mr-1 h-3 w-3" /> Ver detalhes
                          </Link>
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-xs">
                              <FileDown className="mr-1 h-3 w-3" /> Download
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {book.epubUrl && (
                              <DropdownMenuItem onClick={() => handleDownload(book.id, 'epub')}>
                                EPUB
                              </DropdownMenuItem>
                            )}
                            {book.pdfUrl && (
                              <DropdownMenuItem onClick={() => handleDownload(book.id, 'pdf')}>
                                PDF
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {book.amazonUrl && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs flex items-center"
                            onClick={() => window.open(book.amazonUrl, "_blank")}
                          >
                            <ExternalLink className="mr-1 h-3 w-3" /> Amazon
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex items-center text-secondary"
                          onClick={() => handleRemoveFromFavorites(book.id)}
                          disabled={isRemoving === book.id}
                        >
                          <Heart className="mr-1 h-3 w-3 fill-current" /> 
                          {isRemoving === book.id ? "Removendo..." : "Remover"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum favorito encontrado</CardTitle>
              <CardDescription>
                Você ainda não adicionou nenhum livro aos seus favoritos.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/">Explorar livros</Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}
