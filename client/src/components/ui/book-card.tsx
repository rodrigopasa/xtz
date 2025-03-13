import { useState } from "react";
import { Link } from "wouter";
import { Heart, Star, StarHalf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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
        stars.push(
          <Star 
            key={i} 
            className="fill-current text-yellow-400" 
            size={14} 
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarHalf 
            key={i} 
            className="fill-yellow-400 text-yellow-400" 
            size={14} 
          />
        );
      } else {
        stars.push(
          <Star 
            key={i} 
            className="text-gray-300" 
            size={14} 
          />
        );
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
        await apiRequest<{success: boolean}>(`/api/favorites/${id}`, {
          method: "DELETE"
        });
        toast({
          title: "Removido dos favoritos",
          description: `"${title}" foi removido dos seus favoritos.`,
        });
      } else {
        await apiRequest<{id: number}>("/api/favorites", {
          method: "POST",
          body: { bookId: id }
        });
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
    <div 
      className={cn(
        "bg-neutral-900/90 rounded-lg overflow-hidden transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1",
        "border border-purple-500/30",
        className
      )}
    >
      <Link href={`/livro/${slug}/${author.slug}`} className="block relative pb-[140%] overflow-hidden group">
        <img
          src={coverUrl || "/placeholders/book-cover.jpg"}
          alt={`Capa do livro ${title}`}
          className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholders/book-cover.jpg';
          }}
        />
        {isNew && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold py-1 px-3 rounded-full shadow-md">
            NOVO
          </div>
        )}
        {isFeatured && !isNew && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold py-1 px-3 rounded-full shadow-md">
            DESTAQUE
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-10 group-hover:bg-opacity-30 transition-all duration-300"></div>
      </Link>
      <div className="p-4">
        <h3 className="font-serif font-bold text-lg mb-1 line-clamp-1 text-white group-hover:text-purple-300">{title}</h3>
        <p className="text-purple-300 text-sm mb-2 line-clamp-1">{author.name}</p>
        <div className="flex items-center mb-4">
          <div className="flex space-x-1">
            {renderRatingStars()}
          </div>
          <span className="text-xs text-purple-300 ml-2">({ratingCount})</span>
        </div>
        <div className="flex justify-between items-center">
          <Link 
            href={`/livro/${slug}/${author.slug}`} 
            className="text-white bg-purple-600/50 hover:bg-purple-600/80 rounded-full px-3 py-1 font-medium text-sm transition-colors"
          >
            Ver detalhes
          </Link>
          <button 
            className={cn(
              "transition-all duration-200 h-8 w-8 rounded-full flex items-center justify-center",
              isFavorite 
                ? "text-rose-400 bg-rose-800/50 hover:bg-rose-700/60" 
                : "text-gray-400 hover:text-rose-400 hover:bg-rose-800/30"
            )}
            onClick={toggleFavorite}
            disabled={isToggling}
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart className={cn("transition-all", isFavorite ? "fill-current" : "")} size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
