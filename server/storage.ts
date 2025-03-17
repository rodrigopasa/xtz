import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  authors, type Author, type InsertAuthor,
  series, type Series, type InsertSeries,
  books, type Book, type InsertBook,
  favorites, type Favorite, type InsertFavorite,
  readingHistory, type ReadingHistory, type InsertReadingHistory,
  comments, type Comment, type InsertComment
} from "@shared/schema";

export interface IStorage {
  // Usuários
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Categorias
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Autores
  getAllAuthors(): Promise<Author[]>;
  getAuthor(id: number): Promise<Author | undefined>;
  getAuthorBySlug(slug: string): Promise<Author | undefined>;
  createAuthor(author: InsertAuthor): Promise<Author>;
  updateAuthor(id: number, author: Partial<Author>): Promise<Author | undefined>;
  deleteAuthor(id: number): Promise<boolean>;
  
  // Séries
  getAllSeries(): Promise<Series[]>;
  getSeries(id: number): Promise<Series | undefined>;
  getSeriesBySlug(slug: string): Promise<Series | undefined>;
  getSeriesByAuthor(authorId: number): Promise<Series[]>;
  createSeries(series: InsertSeries): Promise<Series>;
  updateSeries(id: number, series: Partial<Series>): Promise<Series | undefined>;
  deleteSeries(id: number): Promise<boolean>;
  getBooksBySeries(seriesId: number): Promise<Book[]>;
  
  // Livros
  getAllBooks(): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  getBookBySlug(slug: string): Promise<Book | undefined>;
  getBooksByCategory(categoryId: number): Promise<Book[]>;
  getBooksByAuthor(authorId: number): Promise<Book[]>;
  getFeaturedBooks(): Promise<Book[]>;
  getNewBooks(): Promise<Book[]>;
  getFreeBooks(): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, book: Partial<Book>): Promise<Book | undefined>;
  deleteBook(id: number): Promise<boolean>;
  incrementDownloadCount(id: number): Promise<Book | undefined>;
  
  // Favoritos
  getFavoritesByUser(userId: number): Promise<Favorite[]>;
  getFavoriteBooks(userId: number): Promise<Book[]>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  deleteFavorite(userId: number, bookId: number): Promise<boolean>;
  isFavorite(userId: number, bookId: number): Promise<boolean>;
  
  // Histórico de leitura
  getReadingHistoryByUser(userId: number): Promise<ReadingHistory[]>;
  getReadingHistoryBooks(userId: number): Promise<(ReadingHistory & { book: Book })[]>;
  createOrUpdateReadingHistory(history: InsertReadingHistory): Promise<ReadingHistory>;
  
  // Comentários
  getCommentsByBook(bookId: number): Promise<Comment[]>;
  getCommentsByUser(userId: number): Promise<Comment[]>;
  getAllComments(): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  approveComment(id: number): Promise<Comment | undefined>;
  incrementHelpfulCount(id: number): Promise<Comment | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private authors: Map<number, Author>;
  private series: Map<number, Series>;
  private books: Map<number, Book>;
  private favorites: Map<number, Favorite>;
  private readingHistory: Map<number, ReadingHistory>;
  private comments: Map<number, Comment>;
  
  private currentUserId: number;
  private currentCategoryId: number;
  private currentAuthorId: number;
  private currentSeriesId: number;
  private currentBookId: number;
  private currentFavoriteId: number;
  private currentReadingHistoryId: number;
  private currentCommentId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.authors = new Map();
    this.series = new Map();
    this.books = new Map();
    this.favorites = new Map();
    this.readingHistory = new Map();
    this.comments = new Map();
    
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentAuthorId = 1;
    this.currentSeriesId = 1;
    this.currentBookId = 1;
    this.currentFavoriteId = 1;
    this.currentReadingHistoryId = 1;
    this.currentCommentId = 1;
    
    // Inicializar com dados de exemplo
    this.initializeData();
  }

  private initializeData() {
    // Categorias iniciais
    const categoriesData: InsertCategory[] = [
      { name: 'Ficção Científica', slug: 'ficcao-cientifica', iconName: 'rocket', bookCount: 0 },
      { name: 'Romance', slug: 'romance', iconName: 'heart', bookCount: 0 },
      { name: 'Mistério', slug: 'misterio', iconName: 'search', bookCount: 0 },
      { name: 'História', slug: 'historia', iconName: 'landmark', bookCount: 0 },
      { name: 'Autoajuda', slug: 'autoajuda', iconName: 'seedling', bookCount: 0 },
      { name: 'Infantil', slug: 'infantil', iconName: 'child', bookCount: 0 }
    ];
    
    categoriesData.forEach(category => {
      this.createCategory(category);
    });
    
    // Autores iniciais
    const authorsData: InsertAuthor[] = [
      { name: 'J. R. R. Tolkien', slug: 'j-r-r-tolkien', bio: 'Autor de O Senhor dos Anéis', imageUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
      { name: 'Frank Herbert', slug: 'frank-herbert', bio: 'Autor de Duna', imageUrl: 'https://randomuser.me/api/portraits/men/2.jpg' },
      { name: 'Aldous Huxley', slug: 'aldous-huxley', bio: 'Autor de Admirável Mundo Novo', imageUrl: 'https://randomuser.me/api/portraits/men/3.jpg' },
      { name: 'Jane Austen', slug: 'jane-austen', bio: 'Autora de Orgulho e Preconceito', imageUrl: 'https://randomuser.me/api/portraits/women/4.jpg' },
      { name: 'Matt Haig', slug: 'matt-haig', bio: 'Autor de A Biblioteca da Meia-Noite', imageUrl: 'https://randomuser.me/api/portraits/men/5.jpg' }
    ];
    
    authorsData.forEach(author => {
      this.createAuthor(author);
    });
    
    // Usuário Admin
    const adminUser: InsertUser = {
      username: 'admin',
      password: 'admin123',
      email: 'admin@bibliotech.com',
      name: 'Administrador',
      role: 'admin',
      avatarUrl: 'https://randomuser.me/api/portraits/men/35.jpg'
    };
    
    this.createUser(adminUser);
    
    // Livros iniciais
    const booksData: InsertBook[] = [
      {
        title: 'O Silmarillion',
        slug: 'o-silmarillion',
        authorId: 1,
        categoryId: 1,
        description: 'O Silmarillion é uma coletânea de obras de J. R. R. Tolkien, editada e publicada postumamente por seu filho Christopher Tolkien, com a assistência de Guy Gavriel Kay.',
        coverUrl: 'https://m.media-amazon.com/images/I/81TmHlRleJL._AC_UF894,1000_QL80_.jpg',
        epubUrl: '/books/o-silmarillion.epub',
        pdfUrl: '/books/o-silmarillion.pdf',
        amazonUrl: 'https://www.amazon.com.br/Silmarillion-J-R-Tolkien/dp/8595084742',
        format: 'both',
        pageCount: 496,
        isbn: '9788595084742',
        publishYear: 1977,
        publisher: 'HarperCollins',
        language: 'pt-BR',
        isFeatured: true,
        isNew: true,
        isFree: false
      },
      {
        title: 'Duna',
        slug: 'duna',
        authorId: 2,
        categoryId: 1,
        description: 'Duna é um romance de ficção científica escrito por Frank Herbert e publicado em 1965. A história se passa em um futuro distante, em meio a um império interplanetário feudal no qual as Casas Nobres controlam territórios planetários.',
        coverUrl: 'https://m.media-amazon.com/images/I/71uQShDujJL._AC_UF894,1000_QL80_.jpg',
        epubUrl: '/books/duna.epub',
        pdfUrl: '/books/duna.pdf',
        amazonUrl: 'https://www.amazon.com.br/Duna-1-Frank-Herbert/dp/6558380519',
        format: 'both',
        pageCount: 680,
        isbn: '9786558380511',
        publishYear: 1965,
        publisher: 'Aleph',
        language: 'pt-BR',
        isFeatured: true,
        isNew: false,
        isFree: false
      },
      {
        title: 'Admirável Mundo Novo',
        slug: 'admiravel-mundo-novo',
        authorId: 3,
        categoryId: 1,
        description: 'Admirável Mundo Novo é um romance distópico escrito por Aldous Huxley e publicado em 1932. A história se passa em Londres no ano 2540, em um futuro onde as pessoas são pré-condicionadas biologicamente e condicionadas psicologicamente a viverem em harmonia com as leis e regras sociais.',
        coverUrl: 'https://m.media-amazon.com/images/I/61hOp6UFvCL._AC_UF894,1000_QL80_.jpg',
        epubUrl: '/books/admiravel-mundo-novo.epub',
        pdfUrl: '/books/admiravel-mundo-novo.pdf',
        amazonUrl: 'https://www.amazon.com.br/Admirável-mundo-novo-Aldous-Huxley/dp/8525056006',
        format: 'both',
        pageCount: 312,
        isbn: '9788525056009',
        publishYear: 1932,
        publisher: 'Biblioteca Azul',
        language: 'pt-BR',
        isFeatured: true,
        isNew: false,
        isFree: false
      },
      {
        title: 'Orgulho e Preconceito',
        slug: 'orgulho-e-preconceito',
        authorId: 4,
        categoryId: 2,
        description: 'Orgulho e Preconceito é um romance da escritora britânica Jane Austen publicado pela primeira vez em 1813. A história acompanha as aventuras de Elizabeth Bennet, uma das cinco filhas de um cavalheiro rural da Inglaterra do século XIX.',
        coverUrl: 'https://m.media-amazon.com/images/I/71tT8HA+n0L._AC_UF894,1000_QL80_.jpg',
        epubUrl: '/books/orgulho-e-preconceito.epub',
        pdfUrl: '/books/orgulho-e-preconceito.pdf',
        amazonUrl: 'https://www.amazon.com.br/Orgulho-preconceito-Jane-Austen/dp/8544001823',
        format: 'both',
        pageCount: 448,
        isbn: '9788544001821',
        publishYear: 1813,
        publisher: 'Martin Claret',
        language: 'pt-BR',
        isFeatured: true,
        isNew: false,
        isFree: false
      },
      {
        title: 'A Biblioteca da Meia-Noite',
        slug: 'a-biblioteca-da-meia-noite',
        authorId: 5,
        categoryId: 1,
        description: 'A Biblioteca da Meia-Noite é um romance do escritor britânico Matt Haig publicado em 2020. A história segue Nora Seed, que vive uma vida de arrependimentos até encontrar a Biblioteca da Meia-Noite, onde cada livro oferece a chance de experimentar outra vida que ela poderia ter vivido.',
        coverUrl: 'https://m.media-amazon.com/images/I/81iqH8dpjuL._AC_UF894,1000_QL80_.jpg',
        epubUrl: '/books/a-biblioteca-da-meia-noite.epub',
        pdfUrl: '/books/a-biblioteca-da-meia-noite.pdf',
        amazonUrl: 'https://www.amazon.com.br/biblioteca-meia-noite-Matt-Haig/dp/6558380063',
        format: 'both',
        pageCount: 308,
        isbn: '9786558380061',
        publishYear: 2020,
        publisher: 'Bertrand Brasil',
        language: 'pt-BR',
        isFeatured: false,
        isNew: true,
        isFree: false
      }
    ];
    
    // Criar livros e armazenar corretamente com seus IDs
    for (let i = 0; i < booksData.length; i++) {
      const newBook = {
        ...booksData[i],
        id: i + 1,
        rating: 0,
        ratingCount: 0,
        downloadCount: 0
      };
      
      // Armazenar diretamente no Map com o ID como chave
      this.books.set(i + 1, newBook);
      
      // Atualizar contagem de livros na categoria
      const category = this.categories.get(newBook.categoryId);
      if (category) {
        this.categories.set(category.id, {
          ...category,
          bookCount: category.bookCount + 1
        });
      }
      
      // Garantir que o próximo ID seja maior que o último usado
      this.currentBookId = Math.max(this.currentBookId, i + 2);
    }
    
    console.log(`Livros inicializados: ${this.books.size}`);
    console.log(`IDs de livros: ${Array.from(this.books.keys()).join(', ')}`);
    console.log(`Próximo ID de livro: ${this.currentBookId}`);
  }

  // Implementação dos métodos para Usuários
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Implementação dos métodos para Categorias
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(category => category.slug === slug);
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const newCategory = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  async updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined> {
    const existingCategory = await this.getCategory(id);
    if (!existingCategory) return undefined;
    
    const updatedCategory = { ...existingCategory, ...category };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }
  
  // Implementação dos métodos para Autores
  async getAllAuthors(): Promise<Author[]> {
    return Array.from(this.authors.values());
  }
  
  async getAuthor(id: number): Promise<Author | undefined> {
    return this.authors.get(id);
  }
  
  async getAuthorBySlug(slug: string): Promise<Author | undefined> {
    return Array.from(this.authors.values()).find(author => author.slug === slug);
  }
  
  async createAuthor(author: InsertAuthor): Promise<Author> {
    const id = this.currentAuthorId++;
    const newAuthor = { ...author, id };
    this.authors.set(id, newAuthor);
    return newAuthor;
  }
  
  async updateAuthor(id: number, author: Partial<Author>): Promise<Author | undefined> {
    const existingAuthor = await this.getAuthor(id);
    if (!existingAuthor) return undefined;
    
    const updatedAuthor = { ...existingAuthor, ...author };
    this.authors.set(id, updatedAuthor);
    return updatedAuthor;
  }
  
  async deleteAuthor(id: number): Promise<boolean> {
    return this.authors.delete(id);
  }
  
  // Implementação dos métodos para Séries
  async getAllSeries(): Promise<Series[]> {
    return Array.from(this.series.values());
  }
  
  async getSeries(id: number): Promise<Series | undefined> {
    return this.series.get(id);
  }
  
  async getSeriesBySlug(slug: string): Promise<Series | undefined> {
    return Array.from(this.series.values()).find(series => series.slug === slug);
  }
  
  async getSeriesByAuthor(authorId: number): Promise<Series[]> {
    return Array.from(this.series.values()).filter(series => series.authorId === authorId);
  }
  
  async createSeries(series: InsertSeries): Promise<Series> {
    const id = this.currentSeriesId++;
    const newSeries = { ...series, id };
    this.series.set(id, newSeries);
    return newSeries;
  }
  
  async updateSeries(id: number, series: Partial<Series>): Promise<Series | undefined> {
    const existingSeries = await this.getSeries(id);
    if (!existingSeries) return undefined;
    
    const updatedSeries = { ...existingSeries, ...series };
    this.series.set(id, updatedSeries);
    return updatedSeries;
  }
  
  async deleteSeries(id: number): Promise<boolean> {
    // Verificar se existem livros associados a esta série
    const books = await this.getBooksBySeries(id);
    if (books.length > 0) {
      // Opcional: atualizar os livros para remover a associação à série
      for (const book of books) {
        await this.updateBook(book.id, { seriesId: null, volumeNumber: null });
      }
    }
    
    return this.series.delete(id);
  }
  
  async getBooksBySeries(seriesId: number): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.seriesId === seriesId);
  }
  
  // Implementação dos métodos para Livros
  async getAllBooks(): Promise<Book[]> {
    return Array.from(this.books.values());
  }
  
  async getBook(id: number): Promise<Book | undefined> {
    console.log(`MemStorage.getBook - ID: ${id}, Tipo: ${typeof id}`);
    console.log(`Chaves disponíveis no Map: ${Array.from(this.books.keys()).join(', ')}`);
    
    // Garantir que o ID seja um número
    const numericId = Number(id);
    if (isNaN(numericId)) {
      console.log(`ID inválido: ${id}`);
      return undefined;
    }
    
    // Tentar buscar diretamente
    const book = this.books.get(numericId);
    console.log(`Livro encontrado direto: ${book ? 'Sim' : 'Não'}`);
    
    // Se não encontrou, vamos tentar verificar iterando por todos
    if (!book) {
      console.log('Buscando por iteração...');
      const allBooks = Array.from(this.books.values());
      const foundBook = allBooks.find(book => book.id === numericId);
      
      if (foundBook) {
        console.log(`Encontrado por iteração: ${foundBook.title}`);
        return foundBook;
      }
      
      console.log('Livro não encontrado por ID em nenhum método');
    }
    
    return book;
  }
  
  async getBookBySlug(slug: string): Promise<Book | undefined> {
    return Array.from(this.books.values()).find(book => book.slug === slug);
  }
  
  async getBooksByCategory(categoryId: number): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.categoryId === categoryId);
  }
  
  async getBooksByAuthor(authorId: number): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.authorId === authorId);
  }
  
  async getFeaturedBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.isFeatured);
  }
  
  async getNewBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.isNew);
  }
  
  async getFreeBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.isFree);
  }
  
  async createBook(book: InsertBook): Promise<Book> {
    const id = this.currentBookId++;
    const newBook = { 
      ...book, 
      id, 
      rating: 0,
      ratingCount: 0,
      downloadCount: 0
    };
    this.books.set(id, newBook);
    
    // Atualizar contagem de livros na categoria
    const category = await this.getCategory(book.categoryId);
    if (category) {
      await this.updateCategory(category.id, {
        bookCount: category.bookCount + 1
      });
    }
    
    // Atualizar contagem de livros na série, se aplicável
    if (book.seriesId) {
      const series = await this.getSeries(book.seriesId);
      if (series) {
        await this.updateSeries(series.id, {
          bookCount: series.bookCount + 1
        });
      }
    }
    
    return newBook;
  }
  
  async updateBook(id: number, book: Partial<Book>): Promise<Book | undefined> {
    const existingBook = await this.getBook(id);
    if (!existingBook) return undefined;
    
    const updatedBook = { ...existingBook, ...book };
    this.books.set(id, updatedBook);
    
    // Se houver uma alteração na série, atualizar as contagens
    if (book.seriesId !== undefined && existingBook.seriesId !== book.seriesId) {
      // Se o livro estava em uma série antes, decrementar a contagem da série antiga
      if (existingBook.seriesId) {
        const oldSeries = await this.getSeries(existingBook.seriesId);
        if (oldSeries && oldSeries.bookCount > 0) {
          await this.updateSeries(oldSeries.id, {
            bookCount: oldSeries.bookCount - 1
          });
        }
      }
      
      // Se o livro está sendo adicionado a uma nova série, incrementar a contagem da nova série
      if (book.seriesId) {
        const newSeries = await this.getSeries(book.seriesId);
        if (newSeries) {
          await this.updateSeries(newSeries.id, {
            bookCount: newSeries.bookCount + 1
          });
        }
      }
    }
    
    return updatedBook;
  }
  
  async deleteBook(id: number): Promise<boolean> {
    const book = await this.getBook(id);
    if (!book) return false;
    
    // Atualizar contagem de livros na categoria
    const category = await this.getCategory(book.categoryId);
    if (category && category.bookCount > 0) {
      await this.updateCategory(category.id, {
        bookCount: category.bookCount - 1
      });
    }
    
    // Atualizar contagem de livros na série, se aplicável
    if (book.seriesId) {
      const series = await this.getSeries(book.seriesId);
      if (series && series.bookCount > 0) {
        await this.updateSeries(series.id, {
          bookCount: series.bookCount - 1
        });
      }
    }
    
    return this.books.delete(id);
  }
  
  async incrementDownloadCount(id: number): Promise<Book | undefined> {
    const book = await this.getBook(id);
    if (!book) return undefined;
    
    const updatedBook = { ...book, downloadCount: book.downloadCount + 1 };
    this.books.set(id, updatedBook);
    return updatedBook;
  }
  
  // Implementação dos métodos para Favoritos
  async getFavoritesByUser(userId: number): Promise<Favorite[]> {
    return Array.from(this.favorites.values()).filter(favorite => favorite.userId === userId);
  }
  
  async getFavoriteBooks(userId: number): Promise<Book[]> {
    const favorites = await this.getFavoritesByUser(userId);
    const books: Book[] = [];
    
    for (const favorite of favorites) {
      const book = await this.getBook(favorite.bookId);
      if (book) books.push(book);
    }
    
    return books;
  }
  
  async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
    // Verificar se já existe
    const existing = await this.isFavorite(favorite.userId, favorite.bookId);
    if (existing) {
      const existingFavorite = Array.from(this.favorites.values()).find(
        f => f.userId === favorite.userId && f.bookId === favorite.bookId
      );
      if (existingFavorite) return existingFavorite;
    }
    
    const id = this.currentFavoriteId++;
    const newFavorite = { 
      ...favorite, 
      id, 
      createdAt: new Date() 
    };
    this.favorites.set(id, newFavorite);
    return newFavorite;
  }
  
  async deleteFavorite(userId: number, bookId: number): Promise<boolean> {
    const favorite = Array.from(this.favorites.values()).find(
      f => f.userId === userId && f.bookId === bookId
    );
    
    if (!favorite) return false;
    return this.favorites.delete(favorite.id);
  }
  
  async isFavorite(userId: number, bookId: number): Promise<boolean> {
    return Array.from(this.favorites.values()).some(
      favorite => favorite.userId === userId && favorite.bookId === bookId
    );
  }
  
  // Implementação dos métodos para Histórico de Leitura
  async getReadingHistoryByUser(userId: number): Promise<ReadingHistory[]> {
    return Array.from(this.readingHistory.values())
      .filter(history => history.userId === userId)
      .sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime());
  }
  
  async getReadingHistoryBooks(userId: number): Promise<(ReadingHistory & { book: Book })[]> {
    const histories = await this.getReadingHistoryByUser(userId);
    const result: (ReadingHistory & { book: Book })[] = [];
    
    for (const history of histories) {
      const book = await this.getBook(history.bookId);
      if (book) {
        result.push({ ...history, book });
      }
    }
    
    return result;
  }
  
  async createOrUpdateReadingHistory(history: InsertReadingHistory): Promise<ReadingHistory> {
    // Verificar se já existe
    const existing = Array.from(this.readingHistory.values()).find(
      h => h.userId === history.userId && h.bookId === history.bookId
    );
    
    if (existing) {
      const updatedHistory = { 
        ...existing, 
        progress: history.progress, 
        isCompleted: history.isCompleted,
        lastReadAt: new Date() 
      };
      this.readingHistory.set(existing.id, updatedHistory);
      return updatedHistory;
    }
    
    const id = this.currentReadingHistoryId++;
    const newHistory = { 
      ...history, 
      id, 
      lastReadAt: new Date() 
    };
    this.readingHistory.set(id, newHistory);
    return newHistory;
  }
  
  // Implementação dos métodos para Comentários
  async getCommentsByBook(bookId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.bookId === bookId && comment.isApproved)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getCommentsByUser(userId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getAllComments(): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.currentCommentId++;
    const newComment = { 
      ...comment, 
      id, 
      createdAt: new Date(),
      helpfulCount: 0
    };
    this.comments.set(id, newComment);
    
    // Atualizar a avaliação média do livro
    const book = await this.getBook(comment.bookId);
    if (book) {
      const bookComments = await this.getCommentsByBook(book.id);
      const totalRating = bookComments.reduce((sum, c) => sum + c.rating, comment.rating);
      const newRatingCount = book.ratingCount + 1;
      const newRating = Math.round(totalRating / newRatingCount);
      
      await this.updateBook(book.id, {
        rating: newRating,
        ratingCount: newRatingCount
      });
    }
    
    return newComment;
  }
  
  async deleteComment(id: number): Promise<boolean> {
    const comment = await this.comments.get(id);
    if (!comment) return false;
    
    // Atualizar a avaliação média do livro
    const book = await this.getBook(comment.bookId);
    if (book && book.ratingCount > 0) {
      const bookComments = (await this.getCommentsByBook(book.id))
        .filter(c => c.id !== id);
      
      const totalRating = bookComments.reduce((sum, c) => sum + c.rating, 0);
      const newRatingCount = book.ratingCount - 1;
      const newRating = newRatingCount > 0 ? Math.round(totalRating / newRatingCount) : 0;
      
      await this.updateBook(book.id, {
        rating: newRating,
        ratingCount: newRatingCount
      });
    }
    
    return this.comments.delete(id);
  }
  
  async approveComment(id: number): Promise<Comment | undefined> {
    const comment = await this.comments.get(id);
    if (!comment) return undefined;
    
    const updatedComment = { ...comment, isApproved: true };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }
  
  async incrementHelpfulCount(id: number): Promise<Comment | undefined> {
    const comment = await this.comments.get(id);
    if (!comment) return undefined;
    
    const updatedComment = { ...comment, helpfulCount: comment.helpfulCount + 1 };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }
}

export const storage = new MemStorage();
