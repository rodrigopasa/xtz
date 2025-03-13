import { useQuery } from "@tanstack/react-query";
import BookCard from "@/components/ui/book-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Book, Library, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface AuthorProps {
  slug: string;
}

export default function Author({ slug }: AuthorProps) {
  // Carregar informações do autor
  const { data: author, isLoading: authorLoading } = useQuery({
    queryKey: [`/api/authors/${slug}`],
  });

  // Carregar livros do autor
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: [`/api/books?author=${slug}`],
    enabled: !!slug,
  });

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">
              Início
            </Link>
            <span className="mx-2">/</span>
            <Link href="/autores" className="hover:text-primary transition-colors">
              Autores
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium truncate">
              {authorLoading ? <Skeleton className="h-4 w-24 inline-block" /> : author?.name}
            </span>
          </div>
        </div>
        
        {/* Seção do Autor */}
        <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {authorLoading ? (
            <div className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <Skeleton className="w-40 h-40 rounded-xl" />
                <div className="flex-1 text-center md:text-left">
                  <Skeleton className="h-10 w-64 mb-3 mx-auto md:mx-0" />
                  <Skeleton className="h-5 w-48 mb-5 mx-auto md:mx-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full max-w-xl" />
                    <Skeleton className="h-4 w-full max-w-xl" />
                    <Skeleton className="h-4 w-full max-w-md" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-0">
              {/* Header com imagem de fundo gradiente */}
              <div className="h-32 bg-gradient-to-r from-primary/80 to-primary/20 relative">
                <div className="absolute -bottom-16 left-8">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-md">
                    <AvatarImage 
                      src={author?.imageUrl} 
                      alt={author?.name} 
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/60 text-white">
                      {author?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              {/* Conteúdo principal */}
              <div className="pt-20 px-8 pb-8">
                <div className="flex flex-col md:flex-row justify-between">
                  <div className="mb-6 md:mb-0">
                    <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
                      {author?.name}
                    </h1>
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Book size={16} />
                        <span className="text-sm font-medium">
                          {books?.length 
                            ? `${books.length} livro${books.length !== 1 ? 's' : ''}` 
                            : 'Nenhum livro'}
                        </span>
                      </div>
                      {author?.bio && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Library size={16} />
                          <span className="text-sm font-medium">Biografia disponível</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {author?.imageUrl && (
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a href={author.imageUrl} target="_blank" rel="noopener noreferrer">
                          <Globe size={16} />
                          <span>Ver imagem</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <h3 className="text-xl font-medium mb-3">Sobre o autor</h3>
                  <div className="text-neutral-700 whitespace-pre-line leading-relaxed">
                    {author?.bio 
                      ? author.bio 
                      : 'Não há informações biográficas disponíveis para este autor no momento. Estamos trabalhando para adicionar mais detalhes em breve.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Livros do Autor */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-2xl md:text-3xl font-bold">
              {authorLoading 
                ? <Skeleton className="h-8 w-48" />
                : `Livros de ${author?.name || 'este autor'}`
              }
            </h2>
            
            {!booksLoading && books?.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Mostrando {books.length} resultado{books.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {booksLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, index) => (
                <div key={index} className={cn(
                  "bg-white rounded-lg overflow-hidden transition-all duration-300",
                  "hover:shadow-xl hover:-translate-y-1",
                  "border border-gray-200"
                )}>
                  <div className="relative pb-[140%]">
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  </div>
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : books?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map((book: any) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  slug={book.slug}
                  coverUrl={book.coverUrl}
                  rating={book.rating}
                  ratingCount={book.ratingCount}
                  isFeatured={book.isFeatured}
                  isNew={book.isNew}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="max-w-md mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                  <Book size={24} />
                </div>
                <h3 className="text-xl font-medium mb-3">Nenhum livro encontrado</h3>
                <p className="text-muted-foreground mb-6">
                  Não existem livros deste autor em nosso catálogo no momento. 
                  Estamos trabalhando para adicionar novos títulos em breve.
                </p>
                <Button asChild>
                  <Link href="/">Voltar para a página inicial</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
