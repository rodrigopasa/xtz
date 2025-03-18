import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Grid } from "lucide-react";
import CategoryCard from "@/components/ui/category-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Categorias() {
  // Carregar todas as categorias
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4" data-text="Todas as Categorias">
          Todas as Categorias
        </h1>
        <p className="text-lg text-white/90 max-w-2xl mx-auto">
          Navegue pela nossa extensa coleção de livros organizados por categorias.
          Encontre facilmente o próximo livro perfeito para sua leitura.
        </p>
      </div>
      
      {/* Categories Grid */}
      <div className="bg-black/20 rounded-xl backdrop-blur-sm border border-white/10 p-6 md:p-8 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {categoriesLoading ? (
            // Loading skeleton
            Array(12).fill(0).map((_, index) => (
              <Card key={index} className="bg-white/5 border-0 shadow-md overflow-hidden">
                <CardContent className="p-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 rounded-full bg-neutral-700/50 flex items-center justify-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-24 mx-auto mb-2" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </CardContent>
              </Card>
            ))
          ) : Array.isArray(categories) && categories.length > 0 ? (
            // Display categories
            categories.map((category: any) => (
              <CategoryCard 
                key={category.id}
                name={category.name}
                slug={category.slug}
                iconName={category.iconName}
                bookCount={category.bookCount}
              />
            ))
          ) : (
            // No categories found
            <div className="col-span-full text-center py-8">
              <Grid className="h-12 w-12 mx-auto mb-4 text-white/50" />
              <h3 className="text-lg font-medium text-white/90 mb-2">Nenhuma categoria encontrada</h3>
              <p className="text-white/70">
                Tente novamente mais tarde ou explore nossos livros destacados.
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