import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import BookCard from "@/components/ui/book-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryProps {
  slug: string;
}

export default function Category({ slug }: CategoryProps) {
  // Carregar informações da categoria
  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: [`/api/categories/${slug}`],
  });

  // Carregar livros da categoria
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: [`/api/books?category=${slug}`],
    enabled: !!slug,
  });

  // Mapeamento de ícone para classe CSS
  const getIconClass = (iconName: string) => {
    const iconMap: Record<string, string> = {
      rocket: "fas fa-rocket",
      heart: "fas fa-heart",
      search: "fas fa-search",
      landmark: "fas fa-landmark",
      seedling: "fas fa-seedling",
      child: "fas fa-child",
      // adicione mais mapeamentos conforme necessário
      default: "fas fa-book"
    };
    
    return iconMap[iconName] || iconMap.default;
  };

  // Cores baseadas no nome da categoria
  const getCategoryColor = (name: string) => {
    const colorClasses = [
      { bg: "bg-primary/10", text: "text-primary" },
      { bg: "bg-secondary/10", text: "text-secondary" },
      { bg: "bg-accent/10", text: "text-accent-dark" },
      { bg: "bg-neutral-200", text: "text-neutral-700" },
      { bg: "bg-success/10", text: "text-success" }
    ];
    
    const index = name ? name.charCodeAt(0) % colorClasses.length : 0;
    return colorClasses[index];
  };

  const colorClass = category ? getCategoryColor(category.name) : { bg: "bg-primary/10", text: "text-primary" };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header da categoria */}
        <div className="mb-10 text-center">
          {categoryLoading ? (
            <>
              <div className="flex justify-center mb-4">
                <Skeleton className="w-20 h-20 rounded-full" />
              </div>
              <Skeleton className="h-10 w-1/3 mx-auto mb-2" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
            </>
          ) : (
            <>
              <div className={`w-20 h-20 mx-auto mb-4 ${colorClass.bg} rounded-full flex items-center justify-center ${colorClass.text}`}>
                <i className={`${getIconClass(category?.iconName || 'default')} text-3xl`}></i>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">{category?.name}</h1>
              <p className="text-neutral-600 text-lg">
                {category?.bookCount 
                  ? `${category.bookCount} livro${category.bookCount !== 1 ? 's' : ''} disponíveis` 
                  : 'Nenhum livro disponível'}
              </p>
            </>
          )}
        </div>

        {/* Listagem de livros */}
        {booksLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, index) => (
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
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-3">Nenhum livro encontrado nesta categoria</h3>
            <p className="text-neutral-600 mb-6">Estamos trabalhando para adicionar novos títulos em breve.</p>
            <Button asChild>
              <Link href="/">Voltar para a página inicial</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
