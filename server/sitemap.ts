import fs from 'fs';
import path from 'path';
import { storage } from './storage';

// Interface para representar um item do sitemap
interface SitemapItem {
  url: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  lastmod?: string;
}

// Classe para gerenciar o sitemap
export class SitemapGenerator {
  private static instance: SitemapGenerator;
  private baseUrl: string;
  private sitemapPath: string;
  
  private constructor() {
    this.baseUrl = process.env.SITE_URL || 'https://elexandria.app';
    this.sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  }
  
  public static getInstance(): SitemapGenerator {
    if (!SitemapGenerator.instance) {
      SitemapGenerator.instance = new SitemapGenerator();
    }
    return SitemapGenerator.instance;
  }
  
  // Gerar o XML do sitemap
  private generateSitemapXml(items: SitemapItem[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    items.forEach(item => {
      xml += '  <url>\n';
      xml += `    <loc>${item.url}</loc>\n`;
      if (item.lastmod) {
        xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
      }
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
      xml += `    <priority>${item.priority.toFixed(1)}</priority>\n`;
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    return xml;
  }
  
  // Formatar data para o formato de data do sitemap (YYYY-MM-DD)
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  // Gerar o sitemap completo
  public async generateSitemap(): Promise<boolean> {
    try {
      const sitemapItems: SitemapItem[] = [];
      const today = this.formatDate(new Date());
      
      // Adicionar páginas estáticas
      sitemapItems.push({
        url: `${this.baseUrl}/`,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: today
      });
      
      sitemapItems.push({
        url: `${this.baseUrl}/explorar`,
        changefreq: 'daily',
        priority: 0.9,
        lastmod: today
      });
      
      sitemapItems.push({
        url: `${this.baseUrl}/categorias`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: today
      });
      
      sitemapItems.push({
        url: `${this.baseUrl}/autores`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: today
      });
      
      sitemapItems.push({
        url: `${this.baseUrl}/lancamentos`,
        changefreq: 'daily',
        priority: 0.9,
        lastmod: today
      });
      
      sitemapItems.push({
        url: `${this.baseUrl}/mais-lidos`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: today
      });
      
      // Adicionar categorias
      const categories = await storage.getAllCategories();
      categories.forEach(category => {
        sitemapItems.push({
          url: `${this.baseUrl}/categoria/${category.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: today
        });
      });
      
      // Adicionar autores
      const authors = await storage.getAllAuthors();
      authors.forEach(author => {
        sitemapItems.push({
          url: `${this.baseUrl}/autor/${author.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: today
        });
      });
      
      // Adicionar livros
      const books = await storage.getAllBooks();
      books.forEach(book => {
        // Todos os livros devem aparecer no sitemap
        sitemapItems.push({
          url: `${this.baseUrl}/livro/${book.slug}`,
          changefreq: 'monthly',
          priority: 0.6,
          lastmod: today
        });
      });
      
      // Gerar o XML do sitemap
      const sitemapXml = this.generateSitemapXml(sitemapItems);
      
      // Verificar se o diretório public existe
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      // Salvar o arquivo sitemap.xml
      fs.writeFileSync(this.sitemapPath, sitemapXml);
      
      console.log(`Sitemap gerado com sucesso: ${this.sitemapPath}`);
      return true;
    } catch (error) {
      console.error('Erro ao gerar sitemap:', error);
      return false;
    }
  }
}

// Exportar singleton
export const sitemapGenerator = SitemapGenerator.getInstance();