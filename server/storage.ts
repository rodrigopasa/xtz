import { db } from './db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
  users as usersTable, type User, type InsertUser,
  categories as categoriesTable, type Category, type InsertCategory,
  authors as authorsTable, type Author, type InsertAuthor,
  series as seriesTable, type Series, type InsertSeries,
  books as booksTable, type Book, type InsertBook,
  favorites as favoritesTable, type Favorite, type InsertFavorite,
  readingHistory as readingHistoryTable, type ReadingHistory, type InsertReadingHistory,
  comments as commentsTable, type Comment, type InsertComment
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
  getBooksBySeries(seriesId: number): Promise<(Book & { author?: { name: string; slug: string } })[]>;

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

export class DatabaseStorage implements IStorage {
  // Implementação dos métodos para Usuários
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(usersTable).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(usersTable)
      .set(user)
      .where(eq(usersTable.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(usersTable);
  }

  // Implementação dos métodos para Séries
  async getAllSeries(): Promise<Series[]> {
    return db.select().from(seriesTable);
  }

  async getSeries(id: number): Promise<Series | undefined> {
    const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, id));
    return series;
  }

  async getSeriesBySlug(slug: string): Promise<Series | undefined> {
    const [series] = await db.select().from(seriesTable).where(eq(seriesTable.slug, slug));
    return series;
  }

  async getSeriesByAuthor(authorId: number): Promise<Series[]> {
    return db.select().from(seriesTable).where(eq(seriesTable.authorId, authorId));
  }

  async createSeries(seriesData: InsertSeries): Promise<Series> {
    const [newSeries] = await db.insert(seriesTable).values(seriesData).returning();
    return newSeries;
  }

  async updateSeries(id: number, seriesData: Partial<Series>): Promise<Series | undefined> {
    const [updatedSeries] = await db
      .update(seriesTable)
      .set(seriesData)
      .where(eq(seriesTable.id, id))
      .returning();
    return updatedSeries;
  }

  async deleteSeries(id: number): Promise<boolean> {
    // Primeiro atualizar os livros para remover a associação com a série
    await db
      .update(booksTable)
      .set({ seriesId: null, volumeNumber: null })
      .where(eq(booksTable.seriesId, id));

    // Então deletar a série
    const [deletedSeries] = await db
      .delete(seriesTable)
      .where(eq(seriesTable.id, id))
      .returning();

    return !!deletedSeries;
  }

  async getBooksBySeries(seriesId: number): Promise<(Book & { author?: { name: string; slug: string } })[]> {
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .where(eq(booksTable.seriesId, seriesId))
      .orderBy(booksTable.volumeNumber);

    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined
    }));
  }

  // Implementação dos métodos para Livros
  async getAllBooks(): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  })[]> {
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
  }

  async getBook(id: number): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  }) | undefined> {
    const [result] = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(eq(booksTable.id, id));
      
    if (!result) return undefined;
    
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return {
      ...result,
      author: result.authorName ? {
        name: result.authorName,
        slug: result.authorSlug
      } : undefined,
      category: result.categoryName ? {
        name: result.categoryName,
        slug: result.categorySlug
      } : undefined
    };
  }

  async getBookBySlug(slug: string): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  }) | undefined> {
    const [result] = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(eq(booksTable.slug, slug));
      
    if (!result) return undefined;
    
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return {
      ...result,
      author: result.authorName ? {
        name: result.authorName,
        slug: result.authorSlug
      } : undefined,
      category: result.categoryName ? {
        name: result.categoryName,
        slug: result.categorySlug
      } : undefined
    };
  }

  async getBooksByCategory(categoryId: number): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  })[]> {
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(eq(booksTable.categoryId, categoryId));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
  }

  async getBooksByAuthor(authorId: number): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  })[]> {
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(eq(booksTable.authorId, authorId));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
  }

  async getFeaturedBooks(): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  })[]> {
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(eq(booksTable.isFeatured, true));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
  }

  async getNewBooks(): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  })[]> {
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(eq(booksTable.isNew, true));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
  }

  async getFreeBooks(): Promise<(Book & { 
    author?: { name: string; slug: string },
    category?: { name: string; slug: string }
  })[]> {
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(eq(booksTable.isFree, true));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [newBook] = await db.insert(booksTable).values(book).returning();
    return newBook;
  }

  async updateBook(id: number, book: Partial<Book>): Promise<Book | undefined> {
    try {
      const [updatedBook] = await db
        .update(booksTable)
        .set(book)
        .where(eq(booksTable.id, id))
        .returning();
      return updatedBook;
    } catch (error) {
      console.error('Error updating book:', error);
      throw error;
    }
  }

  async deleteBook(id: number): Promise<boolean> {
    const [deletedBook] = await db
      .delete(booksTable)
      .where(eq(booksTable.id, id))
      .returning();
    return !!deletedBook;
  }

  async incrementDownloadCount(id: number): Promise<Book | undefined> {
    const [updatedBook] = await db
      .update(booksTable)
      .set({ downloadCount: sql`${booksTable.downloadCount} + 1` })
      .where(eq(booksTable.id, id))
      .returning();
    return updatedBook;
  }

  //Implementação dos métodos para Categorias
  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categoriesTable);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categoriesTable).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categoriesTable)
      .set(category)
      .where(eq(categoriesTable.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const [deletedCategory] = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .returning();
    return !!deletedCategory;
  }

  // Implementação dos métodos para Autores
  async getAllAuthors(): Promise<Author[]> {
    return db.select().from(authorsTable);
  }

  async getAuthor(id: number): Promise<Author | undefined> {
    const [author] = await db.select().from(authorsTable).where(eq(authorsTable.id, id));
    return author;
  }

  async getAuthorBySlug(slug: string): Promise<Author | undefined> {
    const [author] = await db.select().from(authorsTable).where(eq(authorsTable.slug, slug));
    return author;
  }

  async createAuthor(author: InsertAuthor): Promise<Author> {
    const [newAuthor] = await db.insert(authorsTable).values(author).returning();
    return newAuthor;
  }

  async updateAuthor(id: number, author: Partial<Author>): Promise<Author | undefined> {
    const [updatedAuthor] = await db
      .update(authorsTable)
      .set(author)
      .where(eq(authorsTable.id, id))
      .returning();
    return updatedAuthor;
  }

  async deleteAuthor(id: number): Promise<boolean> {
    const [deletedAuthor] = await db
      .delete(authorsTable)
      .where(eq(authorsTable.id, id))
      .returning();
    return !!deletedAuthor;
  }

  // Implementação dos métodos para Favoritos
  async getFavoritesByUser(userId: number): Promise<Favorite[]> {
    return db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId));
  }

  async getFavoriteBooks(userId: number): Promise<(Book & { author?: { name: string; slug: string }, category?: { name: string; slug: string } })[]> {
    const favorites = await this.getFavoritesByUser(userId);
    
    if (favorites.length === 0) {
      return [];
    }
    
    // Buscar livros com informações de autor e categoria
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(inArray(booksTable.id, favorites.map(fav => fav.bookId)));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    return result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
  }

  async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db.insert(favoritesTable).values(favorite).returning();
    return newFavorite;
  }

  async deleteFavorite(userId: number, bookId: number): Promise<boolean> {
    await db.delete(favoritesTable).where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.bookId, bookId)));
    return true;
  }

  async isFavorite(userId: number, bookId: number): Promise<boolean> {
    const [favorite] = await db.select().from(favoritesTable).where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.bookId, bookId)));
    return !!favorite;
  }


  // Implementação dos métodos para Histórico de Leitura
  async getReadingHistoryByUser(userId: number): Promise<ReadingHistory[]> {
    return db.select().from(readingHistoryTable).where(eq(readingHistoryTable.userId, userId)).orderBy(desc(readingHistoryTable.lastReadAt));
  }

  async getReadingHistoryBooks(userId: number): Promise<(ReadingHistory & { 
    book: Book & { 
      author?: { name: string; slug: string }, 
      category?: { name: string; slug: string } 
    } 
  })[]> {
    const histories = await this.getReadingHistoryByUser(userId);
    
    if (histories.length === 0) {
      return [];
    }
    
    const bookIds = histories.map(h => h.bookId);
    
    // Buscar livros com informações de autor e categoria
    const result = await db
      .select({
        ...booksTable,
        authorName: authorsTable.name,
        authorSlug: authorsTable.slug,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug
      })
      .from(booksTable)
      .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
      .leftJoin(categoriesTable, eq(booksTable.categoryId, categoriesTable.id))
      .where(inArray(booksTable.id, bookIds));
      
    // Formatar o resultado para incluir objetos aninhados para autor e categoria
    const enrichedBooks = result.map(book => ({
      ...book,
      author: book.authorName ? {
        name: book.authorName,
        slug: book.authorSlug
      } : undefined,
      category: book.categoryName ? {
        name: book.categoryName,
        slug: book.categorySlug
      } : undefined
    }));
    
    // Mapear o histórico com os livros enriquecidos
    return histories.map(history => {
      const book = enrichedBooks.find(b => b.id === history.bookId);
      return { ...history, book: book! };
    });
  }

  async createOrUpdateReadingHistory(history: InsertReadingHistory): Promise<ReadingHistory> {
    const existing = await db.select().from(readingHistoryTable).where(and(eq(readingHistoryTable.userId, history.userId), eq(readingHistoryTable.bookId, history.bookId)));
    if(existing.length > 0){
      const [updatedHistory] = await db.update(readingHistoryTable).set({ progress: history.progress, isCompleted: history.isCompleted, lastReadAt: new Date() }).where(and(eq(readingHistoryTable.userId, history.userId), eq(readingHistoryTable.bookId, history.bookId))).returning();
      return updatedHistory;
    } else {
      const [newHistory] = await db.insert(readingHistoryTable).values({...history, lastReadAt: new Date()}).returning();
      return newHistory;
    }
  }

  // Implementação dos métodos para Comentários
  async getCommentsByBook(bookId: number): Promise<Comment[]> {
    return db.select().from(commentsTable).where(and(eq(commentsTable.bookId, bookId), eq(commentsTable.isApproved, true))).orderBy(desc(commentsTable.createdAt));
  }

  async getCommentsByUser(userId: number): Promise<Comment[]> {
    return db.select().from(commentsTable).where(eq(commentsTable.userId, userId)).orderBy(desc(commentsTable.createdAt));
  }

  async getAllComments(): Promise<Comment[]> {
    return db.select().from(commentsTable).orderBy(desc(commentsTable.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(commentsTable).values({...comment, createdAt: new Date(), helpfulCount: 0}).returning();
    return newComment;
  }

  async deleteComment(id: number): Promise<boolean> {
    await db.delete(commentsTable).where(eq(commentsTable.id, id));
    return true;
  }

  async approveComment(id: number): Promise<Comment | undefined> {
    const [updatedComment] = await db.update(commentsTable).set({isApproved: true}).where(eq(commentsTable.id, id)).returning();
    return updatedComment;
  }

  async incrementHelpfulCount(id: number): Promise<Comment | undefined> {
    const [updatedComment] = await db.update(commentsTable).set({helpfulCount: sql`${commentsTable.helpfulCount} + 1`}).where(eq(commentsTable.id, id)).returning();
    return updatedComment;
  }
}

export const storage = new DatabaseStorage();