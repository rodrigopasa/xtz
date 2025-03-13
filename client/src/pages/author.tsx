import { useQuery } from "@tanstack/react-query";
import BookCard from "@/components/ui/book-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Seção do Autor */}
        <div className="mb-12">
          {authorLoading ? (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Skeleton className="w-32 h-32 rounded-full" />
              <div className="flex-1 text-center md:text-left">
                <Skeleton className="h-8 w-64 mb-2 mx-auto md:mx-0" />
                <Skeleton className="h-4 w-full max-w-md mb-4" />
                <Skeleton className="h-20 w-full max-w-lg" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="w-32 h-32">
                <AvatarImage src={author?.imageUrl} alt={author?.name} />
                <AvatarFallback className="text-3xl">
                  {author?.name.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">{author?.name}</h1>
                <p className="text-lg text-neutral-600 mb-4">
                  {books?.length 
                    ? `${books.length} livro${books.length !== 1 ? 's' : ''} disponíveis` 
                    : 'Nenhum livro disponível'}
                </p>
                <p className="text-neutral-700 whitespace-pre-line">
                  {author?.bio || 'Não há informações biográficas disponíveis para este autor.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Livros do Autor */}
        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">Livros de {author?.name || 'este autor'}</h2>
          
          {booksLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
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
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <h3 className="text-xl font-medium mb-3">Nenhum livro encontrado deste autor</h3>
              <p className="text-neutral-600 mb-6">Estamos trabalhando para adicionar novos títulos em breve.</p>
              <Button asChild>
                <Link href="/">Voltar para a página inicial</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
