import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Filter, BookOpen } from "lucide-react";
import BookCard from "@/components/ui/book-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Lancamentos() {
  // Carregar novos lançamentos
  const { data: newBooks, isLoading: newBooksLoading } = useQuery({
    queryKey: ["/api/books?isNew=true"],
  });

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4" data-text="Lançamentos">
          Lançamentos
        </h1>
        <p className="text-lg text-white/90 max-w-2xl mx-auto">
          Descubra os livros mais recentes adicionados à nossa biblioteca.
          Fique por dentro das últimas novidades literárias.
        </p>
      </div>
      
      {/* Filtros (futura implementação) */}
      <div className="mb-8">
        <Card className="bg-white/5 border-white/10 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center text-white/80">
              <Filter className="mr-2 h-5 w-5" />
              <span>Ordenar por:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="bg-purple-600/90 px-4 py-2 rounded-md text-white text-sm hover:bg-purple-700 transition-colors">
                Mais recentes
              </button>
              <button className="bg-black/20 px-4 py-2 rounded-md text-white/80 text-sm hover:bg-black/30 transition-colors">
                Mais populares
              </button>
              <button className="bg-black/20 px-4 py-2 rounded-md text-white/80 text-sm hover:bg-black/30 transition-colors">
                Avaliação
              </button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Books Grid */}
      <div className="bg-black/20 rounded-xl backdrop-blur-sm border border-white/10 p-6 md:p-8 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {newBooksLoading ? (
            // Loading skeleton
            Array(10).fill(0).map((_, index) => (
              <div key={index} className="bg-white/5 rounded-lg shadow-md overflow-hidden">
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
            ))
          ) : newBooks?.length > 0 ? (
            // Display books
            newBooks.map((book: any) => (
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
                isNew={true}
              />
            ))
          ) : (
            // No books found
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-white/50" />
              <h3 className="text-xl font-medium text-white/90 mb-2">Nenhum lançamento encontrado</h3>
              <p className="text-white/70 max-w-md mx-auto">
                Ainda não temos novos lançamentos cadastrados. Tente novamente mais tarde ou explore nossos livros em destaque.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation Links */}
      <div className="mt-8 text-center">
        <Link href="/" className="inline-block text-white/80 hover:text-white border-b border-dotted border-white/50 transition-colors">
          ← Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
}