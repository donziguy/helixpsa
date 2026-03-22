import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { knowledgeArticles, articleTicketLinks, tickets, users } from "@/db/schema"
import { and, eq, desc, asc, count, like, or, sql, isNotNull } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

// Input validation schemas
const createArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().min(1, "Content is required"),
  summary: z.string().optional(),
  type: z.enum(['how_to', 'troubleshooting', 'faq', 'procedure', 'policy', 'reference']).default('reference'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tags: z.array(z.string()).default([]),
})

const updateArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  type: z.enum(['how_to', 'troubleshooting', 'faq', 'procedure', 'policy', 'reference']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
})

const articleFiltersSchema = z.object({
  type: z.enum(['how_to', 'troubleshooting', 'faq', 'procedure', 'policy', 'reference']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  authorId: z.string().uuid().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const linkArticleToTicketSchema = z.object({
  articleId: z.string().uuid(),
  ticketId: z.string().uuid(),
})

export const knowledgeRouter = createTRPCRouter({
  // Get all articles for the organization with filters
  getAll: protectedProcedure
    .input(articleFiltersSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(knowledgeArticles.organizationId, ctx.organizationId)]
      
      // Add filters
      if (input.type) {
        conditions.push(eq(knowledgeArticles.type, input.type))
      }
      if (input.status) {
        conditions.push(eq(knowledgeArticles.status, input.status))
      }
      if (input.authorId) {
        conditions.push(eq(knowledgeArticles.authorId, input.authorId))
      }

      let query = ctx.db
        .select({
          id: knowledgeArticles.id,
          title: knowledgeArticles.title,
          summary: knowledgeArticles.summary,
          content: knowledgeArticles.content,
          type: knowledgeArticles.type,
          status: knowledgeArticles.status,
          tags: knowledgeArticles.tags,
          viewCount: knowledgeArticles.viewCount,
          lastViewedAt: knowledgeArticles.lastViewedAt,
          createdAt: knowledgeArticles.createdAt,
          updatedAt: knowledgeArticles.updatedAt,
          publishedAt: knowledgeArticles.publishedAt,
          author: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(knowledgeArticles)
        .leftJoin(users, eq(knowledgeArticles.authorId, users.id))
        .where(and(...conditions))
        .orderBy(desc(knowledgeArticles.updatedAt))

      const results = await query

      // Parse tags from JSON string
      const articlesWithParsedTags = results.map(article => ({
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : [],
      }))

      // Apply search filter
      if (input.search) {
        const searchTerm = input.search.toLowerCase()
        return articlesWithParsedTags.filter(article => 
          article.title.toLowerCase().includes(searchTerm) ||
          article.summary?.toLowerCase().includes(searchTerm) ||
          article.content.toLowerCase().includes(searchTerm) ||
          (article.tags as string[]).some(tag => tag.toLowerCase().includes(searchTerm))
        )
      }

      // Apply tags filter
      if (input.tags && input.tags.length > 0) {
        return articlesWithParsedTags.filter(article => 
          input.tags!.some(filterTag => 
            (article.tags as string[]).some(articleTag => 
              articleTag.toLowerCase().includes(filterTag.toLowerCase())
            )
          )
        )
      }

      return articlesWithParsedTags
    }),

  // Get single article by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const article = await ctx.db
        .select({
          id: knowledgeArticles.id,
          title: knowledgeArticles.title,
          summary: knowledgeArticles.summary,
          content: knowledgeArticles.content,
          type: knowledgeArticles.type,
          status: knowledgeArticles.status,
          tags: knowledgeArticles.tags,
          viewCount: knowledgeArticles.viewCount,
          lastViewedAt: knowledgeArticles.lastViewedAt,
          createdAt: knowledgeArticles.createdAt,
          updatedAt: knowledgeArticles.updatedAt,
          publishedAt: knowledgeArticles.publishedAt,
          author: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(knowledgeArticles)
        .leftJoin(users, eq(knowledgeArticles.authorId, users.id))
        .where(and(
          eq(knowledgeArticles.id, input.id),
          eq(knowledgeArticles.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!article) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Article not found',
        })
      }

      // Update view count and last viewed timestamp
      await ctx.db
        .update(knowledgeArticles)
        .set({
          viewCount: sql`${knowledgeArticles.viewCount} + 1`,
          lastViewedAt: new Date(),
        })
        .where(eq(knowledgeArticles.id, input.id))

      return {
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : [],
        viewCount: (article.viewCount || 0) + 1,
      }
    }),

  // Get articles linked to a ticket
  getByTicketId: protectedProcedure
    .input(z.object({ ticketId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const linkedArticles = await ctx.db
        .select({
          id: knowledgeArticles.id,
          title: knowledgeArticles.title,
          summary: knowledgeArticles.summary,
          type: knowledgeArticles.type,
          status: knowledgeArticles.status,
          tags: knowledgeArticles.tags,
          viewCount: knowledgeArticles.viewCount,
          createdAt: knowledgeArticles.createdAt,
          updatedAt: knowledgeArticles.updatedAt,
          linkCreatedAt: articleTicketLinks.createdAt,
        })
        .from(articleTicketLinks)
        .leftJoin(knowledgeArticles, eq(articleTicketLinks.articleId, knowledgeArticles.id))
        .where(and(
          eq(articleTicketLinks.ticketId, input.ticketId),
          eq(articleTicketLinks.organizationId, ctx.organizationId),
          eq(knowledgeArticles.status, 'published')
        ))
        .orderBy(desc(articleTicketLinks.createdAt))

      return linkedArticles.map(article => ({
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : [],
      }))
    }),

  // Create new article
  create: protectedProcedure
    .input(createArticleSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date()
      
      const [newArticle] = await ctx.db
        .insert(knowledgeArticles)
        .values({
          organizationId: ctx.organizationId,
          title: input.title,
          content: input.content,
          summary: input.summary,
          type: input.type,
          status: input.status,
          tags: JSON.stringify(input.tags),
          authorId: ctx.userId,
          publishedAt: input.status === 'published' ? now : null,
          createdAt: now,
        })
        .returning()

      return newArticle
    }),

  // Update article
  update: protectedProcedure
    .input(updateArticleSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify article belongs to organization
      const existingArticle = await ctx.db
        .select()
        .from(knowledgeArticles)
        .where(and(
          eq(knowledgeArticles.id, input.id),
          eq(knowledgeArticles.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingArticle) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Article not found',
        })
      }

      const updateData: any = { updatedAt: new Date() }
      if (input.title !== undefined) updateData.title = input.title
      if (input.content !== undefined) updateData.content = input.content
      if (input.summary !== undefined) updateData.summary = input.summary
      if (input.type !== undefined) updateData.type = input.type
      if (input.status !== undefined) {
        updateData.status = input.status
        // Set published timestamp when publishing
        if (input.status === 'published' && existingArticle.status !== 'published') {
          updateData.publishedAt = new Date()
        }
      }
      if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags)

      const [updatedArticle] = await ctx.db
        .update(knowledgeArticles)
        .set(updateData)
        .where(eq(knowledgeArticles.id, input.id))
        .returning()

      return updatedArticle
    }),

  // Delete article
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify article belongs to organization
      const existingArticle = await ctx.db
        .select()
        .from(knowledgeArticles)
        .where(and(
          eq(knowledgeArticles.id, input.id),
          eq(knowledgeArticles.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingArticle) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Article not found',
        })
      }

      await ctx.db
        .delete(knowledgeArticles)
        .where(eq(knowledgeArticles.id, input.id))

      return { success: true }
    }),

  // Link article to ticket
  linkToTicket: protectedProcedure
    .input(linkArticleToTicketSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify both article and ticket belong to organization
      const [article, ticket] = await Promise.all([
        ctx.db
          .select()
          .from(knowledgeArticles)
          .where(and(
            eq(knowledgeArticles.id, input.articleId),
            eq(knowledgeArticles.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0]),
        ctx.db
          .select()
          .from(tickets)
          .where(and(
            eq(tickets.id, input.ticketId),
            eq(tickets.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0]),
      ])

      if (!article) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Article not found',
        })
      }

      if (!ticket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      }

      // Check if link already exists
      const existingLink = await ctx.db
        .select()
        .from(articleTicketLinks)
        .where(and(
          eq(articleTicketLinks.articleId, input.articleId),
          eq(articleTicketLinks.ticketId, input.ticketId)
        ))
        .then(rows => rows[0])

      if (existingLink) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Article is already linked to this ticket',
        })
      }

      const [newLink] = await ctx.db
        .insert(articleTicketLinks)
        .values({
          organizationId: ctx.organizationId,
          articleId: input.articleId,
          ticketId: input.ticketId,
          createdBy: ctx.userId,
        })
        .returning()

      return newLink
    }),

  // Unlink article from ticket
  unlinkFromTicket: protectedProcedure
    .input(linkArticleToTicketSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify link exists and belongs to organization
      const existingLink = await ctx.db
        .select()
        .from(articleTicketLinks)
        .where(and(
          eq(articleTicketLinks.articleId, input.articleId),
          eq(articleTicketLinks.ticketId, input.ticketId),
          eq(articleTicketLinks.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingLink) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Link not found',
        })
      }

      await ctx.db
        .delete(articleTicketLinks)
        .where(and(
          eq(articleTicketLinks.articleId, input.articleId),
          eq(articleTicketLinks.ticketId, input.ticketId)
        ))

      return { success: true }
    }),

  // Get knowledge base statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Get total article counts by status
      const statusCounts = await ctx.db
        .select({
          status: knowledgeArticles.status,
          count: count(),
        })
        .from(knowledgeArticles)
        .where(eq(knowledgeArticles.organizationId, ctx.organizationId))
        .groupBy(knowledgeArticles.status)

      // Get article counts by type
      const typeCounts = await ctx.db
        .select({
          type: knowledgeArticles.type,
          count: count(),
        })
        .from(knowledgeArticles)
        .where(and(
          eq(knowledgeArticles.organizationId, ctx.organizationId),
          eq(knowledgeArticles.status, 'published')
        ))
        .groupBy(knowledgeArticles.type)

      // Get most viewed articles
      const topViewed = await ctx.db
        .select({
          id: knowledgeArticles.id,
          title: knowledgeArticles.title,
          viewCount: knowledgeArticles.viewCount,
        })
        .from(knowledgeArticles)
        .where(and(
          eq(knowledgeArticles.organizationId, ctx.organizationId),
          eq(knowledgeArticles.status, 'published')
        ))
        .orderBy(desc(knowledgeArticles.viewCount))
        .limit(5)

      // Get recently updated articles
      const recentlyUpdated = await ctx.db
        .select({
          id: knowledgeArticles.id,
          title: knowledgeArticles.title,
          updatedAt: knowledgeArticles.updatedAt,
        })
        .from(knowledgeArticles)
        .where(and(
          eq(knowledgeArticles.organizationId, ctx.organizationId),
          eq(knowledgeArticles.status, 'published')
        ))
        .orderBy(desc(knowledgeArticles.updatedAt))
        .limit(5)

      const totalArticles = statusCounts.reduce((sum, item) => sum + (item.count || 0), 0)
      const publishedCount = statusCounts.find(item => item.status === 'published')?.count || 0
      const draftCount = statusCounts.find(item => item.status === 'draft')?.count || 0

      return {
        total: totalArticles,
        published: publishedCount,
        draft: draftCount,
        byStatus: Object.fromEntries(statusCounts.map(item => [item.status, item.count])),
        byType: Object.fromEntries(typeCounts.map(item => [item.type, item.count])),
        topViewed,
        recentlyUpdated,
      }
    }),

  // Search articles (enhanced search with relevance scoring)
  search: protectedProcedure
    .input(z.object({ 
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const searchTerm = input.query.toLowerCase()

      // Get all published articles for text search
      const articles = await ctx.db
        .select({
          id: knowledgeArticles.id,
          title: knowledgeArticles.title,
          summary: knowledgeArticles.summary,
          content: knowledgeArticles.content,
          type: knowledgeArticles.type,
          tags: knowledgeArticles.tags,
          viewCount: knowledgeArticles.viewCount,
          createdAt: knowledgeArticles.createdAt,
          updatedAt: knowledgeArticles.updatedAt,
          author: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(knowledgeArticles)
        .leftJoin(users, eq(knowledgeArticles.authorId, users.id))
        .where(and(
          eq(knowledgeArticles.organizationId, ctx.organizationId),
          eq(knowledgeArticles.status, 'published')
        ))

      // Calculate relevance scores
      const searchResults = articles
        .map(article => {
          const title = article.title.toLowerCase()
          const summary = article.summary?.toLowerCase() || ''
          const content = article.content.toLowerCase()
          const tags = article.tags ? JSON.parse(article.tags) : []
          const tagsText = tags.join(' ').toLowerCase()

          let score = 0
          
          // Title matches (highest weight)
          if (title.includes(searchTerm)) {
            score += title === searchTerm ? 100 : 50
          }
          
          // Summary matches
          if (summary.includes(searchTerm)) {
            score += 30
          }
          
          // Content matches
          const contentMatches = (content.match(new RegExp(searchTerm, 'g')) || []).length
          score += Math.min(contentMatches * 5, 25)
          
          // Tag matches
          if (tagsText.includes(searchTerm)) {
            score += 20
          }
          
          // Boost score by view count (popularity)
          score += Math.min((article.viewCount || 0) * 0.1, 10)

          return {
            ...article,
            tags: tags,
            relevanceScore: score,
          }
        })
        .filter(article => article.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, input.limit)

      return searchResults
    }),

  // Get all unique tags
  getTags: protectedProcedure
    .query(async ({ ctx }) => {
      const articles = await ctx.db
        .select({
          tags: knowledgeArticles.tags,
        })
        .from(knowledgeArticles)
        .where(and(
          eq(knowledgeArticles.organizationId, ctx.organizationId),
          isNotNull(knowledgeArticles.tags)
        ))

      const allTags = new Set<string>()
      
      articles.forEach(article => {
        if (article.tags) {
          const tags = JSON.parse(article.tags) as string[]
          tags.forEach(tag => allTags.add(tag))
        }
      })

      return Array.from(allTags).sort()
    }),
})