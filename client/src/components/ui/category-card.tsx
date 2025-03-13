import { Link } from "wouter";

interface CategoryCardProps {
  name: string;
  slug: string;
  iconName: string;
  bookCount: number;
}

export default function CategoryCard({ name, slug, iconName, bookCount }: CategoryCardProps) {
  // Função para mapear nomes de ícones para classes do FontAwesome
  const getIconClass = (iconName: string) => {
    const iconMap: Record<string, string> = {
      rocket: "fas fa-rocket",
      heart: "fas fa-heart",
      search: "fas fa-search",
      landmark: "fas fa-landmark",
      seedling: "fas fa-seedling",
      child: "fas fa-child",
      book: "fas fa-book",
      globe: "fas fa-globe",
      brain: "fas fa-brain",
      utensils: "fas fa-utensils",
      music: "fas fa-music",
      palette: "fas fa-palette",
      theater: "fas fa-theater-masks",
      film: "fas fa-film",
      code: "fas fa-code",
      briefcase: "fas fa-briefcase",
      graduation: "fas fa-graduation-cap",
      dumbbell: "fas fa-dumbbell",
      praying: "fas fa-praying-hands",
      microscope: "fas fa-microscope"
    };
    
    return iconMap[iconName] || "fas fa-book";
  };
  
  // Função para gerar cores com base no nome da categoria
  const getCategoryColor = (name: string) => {
    const colorClasses = [
      { bg: "bg-primary/10", text: "text-primary", hoverBg: "bg-primary", hoverText: "text-white" },
      { bg: "bg-secondary/10", text: "text-secondary", hoverBg: "bg-secondary", hoverText: "text-white" },
      { bg: "bg-accent/10", text: "text-accent-dark", hoverBg: "bg-accent", hoverText: "text-white" },
      { bg: "bg-neutral-200", text: "text-neutral-700", hoverBg: "bg-neutral-700", hoverText: "text-white" },
      { bg: "bg-success/10", text: "text-success", hoverBg: "bg-success", hoverText: "text-white" }
    ];
    
    // Use uma combinação simples baseada na primeira letra para escolher uma cor
    const index = name.charCodeAt(0) % colorClasses.length;
    return colorClasses[index];
  };
  
  const colorClass = getCategoryColor(name);
  
  return (
    <Link 
      href={`/categoria/${slug}`} 
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 text-center group"
    >
      <div className={`w-16 h-16 mx-auto mb-3 ${colorClass.bg} rounded-full flex items-center justify-center ${colorClass.text} group-hover:${colorClass.hoverBg} group-hover:${colorClass.hoverText} transition-colors`}>
        <i className={`${getIconClass(iconName)} text-2xl`}></i>
      </div>
      <h3 className="font-medium text-neutral-800">{name}</h3>
      <p className="text-sm text-neutral-500">{bookCount} livros</p>
    </Link>
  );
}
