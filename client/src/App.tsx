import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

// Layout Components
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import AdminHeader from "@/components/layout/admin-header";
import AdminSidebar from "@/components/layout/admin-sidebar";
import Sidebar from "@/components/layout/sidebar";

// Public Pages
import Home from "@/pages/home";
import BookDetail from "@/pages/book-detail";
import Category from "@/pages/category";
import Author from "@/pages/author";
import Reader from "@/pages/reader";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

// User Dashboard Pages
import UserDashboard from "@/pages/user/dashboard";
import UserFavorites from "@/pages/user/favorites";
import UserHistory from "@/pages/user/history";
import UserSettings from "@/pages/user/settings";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminBooks from "@/pages/admin/books";
import AdminBookForm from "@/pages/admin/book-form";
import AdminCategories from "@/pages/admin/categories";
import AdminAuthors from "@/pages/admin/authors";
import AdminUsers from "@/pages/admin/users";
import AdminComments from "@/pages/admin/comments";

// Router with layout wrappers
function Router() {
  return (
    <Switch>
      {/* Public routes with header and footer */}
      <Route path="/">
        {() => (
          <>
            <Header />
            <Home />
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/livro/:slug/:authorSlug">
        {(params) => (
          <>
            <Header />
            <BookDetail slug={params.slug} authorSlug={params.authorSlug} />
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/categoria/:slug">
        {(params) => (
          <>
            <Header />
            <Category slug={params.slug} />
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/autor/:slug">
        {(params) => (
          <>
            <Header />
            <Author slug={params.slug} />
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/ler/:id/:format">
        {(params) => (
          <>
            <Header />
            <Reader id={parseInt(params.id)} format={params.format} />
            <Footer />
          </>
        )}
      </Route>

      {/* Auth routes */}
      <Route path="/login">
        {() => (
          <>
            <Header />
            <Login />
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/cadastro">
        {() => (
          <>
            <Header />
            <Register />
            <Footer />
          </>
        )}
      </Route>
      
      {/* User dashboard routes with sidebar */}
      <Route path="/perfil">
        {() => (
          <>
            <Header />
            <div className="flex-grow flex">
              <Sidebar />
              <UserDashboard />
            </div>
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/favoritos">
        {() => (
          <>
            <Header />
            <div className="flex-grow flex">
              <Sidebar />
              <UserFavorites />
            </div>
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/historico">
        {() => (
          <>
            <Header />
            <div className="flex-grow flex">
              <Sidebar />
              <UserHistory />
            </div>
            <Footer />
          </>
        )}
      </Route>
      
      <Route path="/configuracoes">
        {() => (
          <>
            <Header />
            <div className="flex-grow flex">
              <Sidebar />
              <UserSettings />
            </div>
            <Footer />
          </>
        )}
      </Route>
      
      {/* Admin routes with admin header and sidebar */}
      <Route path="/admin">
        {() => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminDashboard />
            </div>
          </>
        )}
      </Route>
      
      <Route path="/admin/livros">
        {() => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminBooks />
            </div>
          </>
        )}
      </Route>
      
      <Route path="/admin/livros/novo">
        {() => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminBookForm />
            </div>
          </>
        )}
      </Route>
      
      <Route path="/admin/livros/editar/:id">
        {(params) => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminBookForm id={parseInt(params.id)} />
            </div>
          </>
        )}
      </Route>
      
      <Route path="/admin/categorias">
        {() => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminCategories />
            </div>
          </>
        )}
      </Route>
      
      <Route path="/admin/autores">
        {() => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminAuthors />
            </div>
          </>
        )}
      </Route>
      
      <Route path="/admin/usuarios">
        {() => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminUsers />
            </div>
          </>
        )}
      </Route>
      
      <Route path="/admin/comentarios">
        {() => (
          <>
            <AdminHeader />
            <div className="flex-grow flex">
              <AdminSidebar />
              <AdminComments />
            </div>
          </>
        )}
      </Route>
      
      {/* Fallback 404 route */}
      <Route>
        {() => (
          <>
            <Header />
            <NotFound />
            <Footer />
          </>
        )}
      </Route>
    </Switch>
  );
}

// Componente para inicializar autenticação
function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth, isLoading } = useAuth();
  
  useEffect(() => {
    console.log("App inicializado, verificando autenticação...");
    checkAuth().then(result => {
      console.log("Verificação de autenticação concluída:", result);
    });
  }, [checkAuth]);
  
  return (
    <>
      {children}
    </>
  );
}

// Componente de estrelas animadas
function FallingStars() {
  const [stars, setStars] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const createStars = () => {
      const starCount = 20;
      const newStars = [];
      
      for (let i = 0; i < starCount; i++) {
        const topOffset = Math.random() * 100;
        const fallDelay = Math.random() * 10;
        const fallDuration = 6 + Math.random() * 6;
        const starColor = i % 3 === 0 ? '#c084fc' : i % 3 === 1 ? '#a78bfa' : '#8b5cf6';
        
        newStars.push(
          <div 
            key={i}
            className="star"
            style={{
              '--top-offset': `${topOffset}vh`,
              '--fall-delay': `${fallDelay}s`,
              '--star-fall-duration': `${fallDuration}s`,
              '--star-color': starColor
            } as React.CSSProperties}
          />
        );
      }
      
      setStars(newStars);
    };
    
    createStars();
  }, []);
  
  return <div className="stars">{stars}</div>;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <FallingStars />
            <Router />
            <Toaster />
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
