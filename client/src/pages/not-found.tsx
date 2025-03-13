import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookX, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="container mx-auto py-16 px-4 md:px-6 min-h-[calc(100vh-200px)] flex items-center justify-center">
      <Card className="w-full max-w-md mx-auto glass-card border-purple-300/20">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-purple-100/10 flex items-center justify-center mb-4 pulse">
              <BookX className="h-12 w-12 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2 mt-2">Página não encontrada</h1>
            <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mb-4"></div>
            <p className="text-base text-gray-300 mb-6 max-w-sm">
              O livro que você está procurando não está em nossa biblioteca. Talvez ele tenha sido transferido para outra dimensão.
            </p>
            
            <div className="space-y-3">
              <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-purple-800 shadow-md shadow-purple-900/20">
                <Link href="/">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar para Página Inicial
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-purple-300/10 text-sm text-gray-400">
            <p>Código de erro: 404 - Página inexistente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
