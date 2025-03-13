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
      { bg: "bg-purple-500", text: "text-white", hoverBg: "bg-purple-600", hoverText: "text-white" },
      { bg: "bg-blue-500", text: "text-white", hoverBg: "bg-blue-600", hoverText: "text-white" },
      { bg: "bg-pink-500", text: "text-white", hoverBg: "bg-pink-600", hoverText: "text-white" },
      { bg: "bg-indigo-500", text: "text-white", hoverBg: "bg-indigo-600", hoverText: "text-white" },
      { bg: "bg-emerald-500", text: "text-white", hoverBg: "bg-emerald-600", hoverText: "text-white" }
    ];
    
    // Use uma combinação simples baseada na primeira letra para escolher uma cor
    const index = name.charCodeAt(0) % colorClasses.length;
    return colorClasses[index];
  };
  
  const colorClass = getCategoryColor(name);
  
  return (
    <Link 
      href={`/categoria/${slug}`} 
      className="bg-neutral-900/90 backdrop-blur-sm rounded-lg border border-purple-500/30 shadow-lg hover:shadow-xl transition-all p-4 text-center group hover:-translate-y-1 duration-300"
    >
      <div className={`w-16 h-16 mx-auto mb-3 ${colorClass.bg} rounded-full flex items-center justify-center ${colorClass.text} transition-colors shadow-lg`}>
        <i className={`${getIconClass(iconName)} text-2xl`}></i>
      </div>
      <h3 className="font-bold text-lg text-white">{name}</h3>
      <p className="text-sm font-medium text-purple-300">{bookCount} livros</p>
    </Link>
  );
}
