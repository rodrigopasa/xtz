import { useState } from "react";
import { Link } from "wouter";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface BookCardProps {
  id: number;
  title: string;
  author: {
    name: string;
    slug: string;
  };
  slug: string;
  coverUrl: string;
  rating: number;
  ratingCount: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isFavorite?: boolean;
  className?: string;
}

export default function BookCard({
  id,
  title,
  author,
  slug,
  coverUrl,
  rating,
  ratingCount,
  isNew,
  isFeatured,
  isFavorite: initialIsFavorite = false,
  className = "",
}: BookCardProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const renderRatingStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<i key={i} className="fas fa-star"></i>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<i key={i} className="fas fa-star-half-alt"></i>);
      } else {
        stars.push(<i key={i} className="far fa-star"></i>);
      }
    }

    return stars;
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !user) {
      toast({
        title: "Não autenticado",
        description: "Faça login para adicionar aos favoritos",
        variant: "destructive",
      });
      return;
    }

    if (isToggling) return;

    setIsToggling(true);
    try {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${id}`);
        toast({
          title: "Removido dos favoritos",
          description: `"${title}" foi removido dos seus favoritos.`,
        });
      } else {
        await apiRequest("POST", "/api/favorites", { bookId: id });
        toast({
          title: "Adicionado aos favoritos",
          description: `"${title}" foi adicionado aos seus favoritos.`,
        });
      }

      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar favoritos.",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${className}`}>
      <Link href={`/livro/${slug}/${author.slug}`} className="block relative pb-[140%]">
        <img
          src={coverUrl}
          alt={`Capa do livro ${title}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {isNew && (
          <div className="absolute top-2 right-2 bg-accent text-neutral-800 text-xs font-bold py-1 px-2 rounded">
            NOVO
          </div>
        )}
        {isFeatured && !isNew && (
          <div className="absolute top-2 right-2 bg-secondary text-white text-xs font-bold py-1 px-2 rounded">
            DESTAQUE
          </div>
        )}
      </Link>
      <div className="p-4">
        <h3 className="font-serif font-bold text-lg mb-1 line-clamp-1">{title}</h3>
        <p className="text-neutral-600 text-sm mb-2">{author.name}</p>
        <div className="flex items-center mb-3">
          <div className="flex text-accent">
            {renderRatingStars()}
          </div>
          <span className="text-xs text-neutral-500 ml-1">({ratingCount})</span>
        </div>
        <div className="flex justify-between items-center">
          <Link href={`/livro/${slug}/${author.slug}`} className="text-primary hover:text-primary-dark font-medium text-sm">
            Ver detalhes
          </Link>
          <button 
            className={`transition-colors ${isFavorite ? 'text-secondary' : 'text-neutral-400 hover:text-secondary'}`}
            onClick={toggleFavorite}
            disabled={isToggling}
          >
            <Heart className={isFavorite ? "fill-current" : ""} size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
