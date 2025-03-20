import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { UserX } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils";

export default function Autores() {
  // Carregar todos os autores
  const { data: authors, isLoading: authorsLoading } = useQuery({
    queryKey: ["/api/authors"],
  });

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4" data-text="Autores">
          Autores
        </h1>
        <p className="text-lg text-white/90 max-w-2xl mx-auto">
          Conheça os talentosos autores que compõem nossa biblioteca.
          Explore suas obras e descubra novas histórias fascinantes.
        </p>
      </div>
      
      {/* Authors Grid */}
      <div className="bg-black/20 rounded-xl backdrop-blur-sm border border-white/10 p-6 md:p-8 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {authorsLoading ? (
            // Loading skeleton
            Array(8).fill(0).map((_, index) => (
              <Card key={index} className="bg-white/5 border-0 shadow-md overflow-hidden">
                <CardContent className="p-6 flex flex-col items-center">
                  <Skeleton className="h-24 w-24 rounded-full mb-4" />
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardContent>
              </Card>
            ))
          ) : authors?.length > 0 ? (
            // Display authors
            authors.map((author: any) => (
              <Link key={author.id} href={`/autor/${author.slug}`}>
                <Card className="bg-white/5 border-0 shadow-md overflow-hidden hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <CardContent className="p-6 flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4 shadow-md border-2 border-purple-500/30">
                      <AvatarImage src={author.imageUrl} alt={author.name} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-800 to-purple-900 text-white text-lg">
                        {getInitials(author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold mb-2 text-center text-white">{author.name}</h3>
                    <p className="text-sm text-white/70 text-center line-clamp-2">
                      {author.bio || "Autor de obras renomadas na Elexandria."}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            // No authors found
            <div className="col-span-full text-center py-12">
              <UserX className="h-16 w-16 mx-auto mb-4 text-white/50" />
              <h3 className="text-xl font-medium text-white/90 mb-2">Nenhum autor encontrado</h3>
              <p className="text-white/70 max-w-md mx-auto">
                Ainda não temos autores cadastrados no sistema. Tente novamente mais tarde ou explore nossos livros destacados.
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