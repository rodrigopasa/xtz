// Arquivo alternativo para usar SQLite em vez de PostgreSQL
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import { eq, sql, SQLiteColumn } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

console.log('Configurando SQLite como banco de dados alternativo');

// Garante que o diretório de dados existe
const DATA_DIR = process.env.SQLITE_DATA_DIR || './data';
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Criando diretório de dados: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'elexandria.db');
console.log(`Usando banco de dados SQLite em: ${DB_PATH}`);

// Inicializa o banco de dados SQLite
const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

// Função para verificar e criar tabelas se não existirem
export async function initializeSQLiteDatabase() {
  console.log('Inicializando banco de dados SQLite...');
  
  try {
    // Verifica se as tabelas existem e as cria se necessário
    // Usuários
    if (!tableExists('users')) {
      console.log('Criando tabela de usuários...');
      sqlite.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          avatarUrl TEXT,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Categorias
    if (!tableExists('categories')) {
      console.log('Criando tabela de categorias...');
      sqlite.exec(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          iconName TEXT
        )
      `);
    }

    // Autores
    if (!tableExists('authors')) {
      console.log('Criando tabela de autores...');
      sqlite.exec(`
        CREATE TABLE authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          bio TEXT,
          photoUrl TEXT
        )
      `);
    }

    // Livros
    if (!tableExists('books')) {
      console.log('Criando tabela de livros...');
      sqlite.exec(`
        CREATE TABLE books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          authorId INTEGER NOT NULL,
          categoryId INTEGER,
          description TEXT,
          coverUrl TEXT,
          epubUrl TEXT,
          pdfUrl TEXT,
          amazonUrl TEXT,
          format TEXT NOT NULL,
          pageCount INTEGER,
          isbn TEXT,
          publishYear INTEGER,
          publisher TEXT,
          language TEXT NOT NULL DEFAULT 'pt',
          isFeatured INTEGER NOT NULL DEFAULT 0,
          isNew INTEGER NOT NULL DEFAULT 0,
          isFree INTEGER NOT NULL DEFAULT 1,
          downloadCount INTEGER NOT NULL DEFAULT 0,
          rating REAL NOT NULL DEFAULT 0,
          ratingCount INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          seriesId INTEGER,
          volumeNumber INTEGER,
          FOREIGN KEY (authorId) REFERENCES authors(id),
          FOREIGN KEY (categoryId) REFERENCES categories(id)
        )
      `);
    }

    // Lista de leitura
    if (!tableExists('reading_list')) {
      console.log('Criando tabela de lista de leitura...');
      sqlite.exec(`
        CREATE TABLE reading_list (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          bookId INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'to_read',
          progress INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (bookId) REFERENCES books(id),
          UNIQUE(userId, bookId)
        )
      `);
    }

    // Favoritos
    if (!tableExists('favorites')) {
      console.log('Criando tabela de favoritos...');
      sqlite.exec(`
        CREATE TABLE favorites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          bookId INTEGER NOT NULL,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (bookId) REFERENCES books(id),
          UNIQUE(userId, bookId)
        )
      `);
    }

    // Histórico de leitura
    if (!tableExists('reading_history')) {
      console.log('Criando tabela de histórico de leitura...');
      sqlite.exec(`
        CREATE TABLE reading_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          bookId INTEGER NOT NULL,
          lastPage INTEGER NOT NULL DEFAULT 0,
          lastPosition TEXT,
          totalPages INTEGER,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (bookId) REFERENCES books(id),
          UNIQUE(userId, bookId)
        )
      `);
    }

    // Comentários
    if (!tableExists('comments')) {
      console.log('Criando tabela de comentários...');
      sqlite.exec(`
        CREATE TABLE comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          bookId INTEGER NOT NULL,
          content TEXT NOT NULL,
          rating INTEGER,
          isApproved INTEGER NOT NULL DEFAULT 0,
          helpfulCount INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (bookId) REFERENCES books(id)
        )
      `);
    }

    // Configurações do site
    if (!tableExists('site_settings')) {
      console.log('Criando tabela de configurações do site...');
      sqlite.exec(`
        CREATE TABLE site_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          siteName TEXT NOT NULL DEFAULT 'Elexandria',
          siteDescription TEXT NOT NULL DEFAULT 'Sua biblioteca digital',
          siteUrl TEXT NOT NULL DEFAULT 'https://elexandria.com',
          contactEmail TEXT NOT NULL DEFAULT 'contato@elexandria.com',
          logoUrl TEXT,
          faviconUrl TEXT,
          primaryColor TEXT NOT NULL DEFAULT '#A855F7',
          featuredBooks TEXT,
          maintenanceMode INTEGER NOT NULL DEFAULT 0,
          allowRegistration INTEGER NOT NULL DEFAULT 1,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insere configurações padrão
      sqlite.exec(`
        INSERT INTO site_settings (siteName, siteDescription, siteUrl, contactEmail, primaryColor)
        VALUES ('Elexandria', 'Sua biblioteca digital', 'https://elexandria.com', 'contato@elexandria.com', '#A855F7')
      `);
    }

    console.log('Inicialização do banco de dados SQLite concluída com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar banco de dados SQLite:', error);
    return false;
  }
}

// Função para verificar se uma tabela existe
function tableExists(tableName: string): boolean {
  const result = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
  return !!result;
}

// Verificação da saúde do banco de dados
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = db.select({ value: sql`1` }).execute();
    return result.length > 0 && result[0].value === 1;
  } catch (error) {
    console.error('Erro ao verificar saúde do banco de dados:', error);
    return false;
  }
}