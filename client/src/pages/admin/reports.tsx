import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  AreaChart, 
  BarChart,
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Area, 
  Tooltip, 
  Bar
} from "recharts";
import { 
  BookOpen, 
  Download, 
  Users, 
  Star,
  TrendingUp,
  Clock,
  Calendar
} from "lucide-react";

export default function AdminReports() {
  // Dados de exemplo para os gráficos
  // Em uma implementação real, esses dados seriam carregados do servidor
  const monthlyDownloads = [
    { name: "Jan", downloads: 65 },
    { name: "Fev", downloads: 85 },
    { name: "Mar", downloads: 102 },
    { name: "Abr", downloads: 120 },
    { name: "Mai", downloads: 90 },
    { name: "Jun", downloads: 105 },
    { name: "Jul", downloads: 138 },
    { name: "Ago", downloads: 145 },
    { name: "Set", downloads: 162 },
    { name: "Out", downloads: 180 },
    { name: "Nov", downloads: 192 },
    { name: "Dez", downloads: 210 },
  ];

  const categoryDistribution = [
    { name: "Ficção", count: 42 },
    { name: "Não-Ficção", count: 28 },
    { name: "Fantasia", count: 35 },
    { name: "Romance", count: 20 },
    { name: "Técnico", count: 15 },
    { name: "Outros", count: 10 },
  ];

  return (
    <div className="flex-1 p-8 bg-neutral-950">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Relatórios e Estatísticas</h1>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-neutral-800 text-white rounded-md hover:bg-neutral-700 transition-colors">
            <Calendar className="h-4 w-4 mr-2 inline-block" />
            Este Mês
          </button>
          <button className="px-4 py-2 bg-neutral-800 text-white rounded-md hover:bg-neutral-700 transition-colors">
            <Download className="h-4 w-4 mr-2 inline-block" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white/5 border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-md bg-purple-900/50 flex items-center justify-center text-purple-400 mr-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-white/70">Total de Livros</p>
                <h3 className="text-2xl font-bold text-white">245</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">12%</span>
              <span className="text-white/50 ml-1">aumento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-md bg-blue-900/50 flex items-center justify-center text-blue-400 mr-4">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-white/70">Downloads</p>
                <h3 className="text-2xl font-bold text-white">1,280</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">18%</span>
              <span className="text-white/50 ml-1">aumento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-md bg-green-900/50 flex items-center justify-center text-green-400 mr-4">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-white/70">Usuários</p>
                <h3 className="text-2xl font-bold text-white">320</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">5%</span>
              <span className="text-white/50 ml-1">aumento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-md bg-yellow-900/50 flex items-center justify-center text-yellow-400 mr-4">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-white/70">Avaliações</p>
                <h3 className="text-2xl font-bold text-white">520</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">8%</span>
              <span className="text-white/50 ml-1">aumento</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white/5 border-0 shadow-md overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white">Downloads Mensais</CardTitle>
            <CardDescription className="text-white/60">
              Análise do número de downloads ao longo do ano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyDownloads}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="downloads" 
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorDownloads)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-0 shadow-md overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white">Distribuição por Categoria</CardTitle>
            <CardDescription className="text-white/60">
              Número de livros por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/5 border-0 shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">Atividade Recente</CardTitle>
          <CardDescription className="text-white/60">
            Últimas ações realizadas na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex">
                <div className="mr-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-900/50">
                    <Clock className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-white">Novo livro adicionado: "O Segredo do Universo"</p>
                  <p className="text-sm text-white/60">Há {i * 2} horas por Admin</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}