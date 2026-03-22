"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useToastHelpers } from "@/lib/toast-context";
import { api } from "@/utils/api";

// Article type and status configurations
const articleTypeConfig = {
  how_to: { label: "How To", icon: "📋", bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb" },
  troubleshooting: { label: "Troubleshooting", icon: "🔧", bg: "rgba(245, 158, 11, 0.1)", color: "#d97706" },
  faq: { label: "FAQ", icon: "❓", bg: "rgba(139, 92, 246, 0.1)", color: "#7c3aed" },
  procedure: { label: "Procedure", icon: "📝", bg: "rgba(16, 185, 129, 0.1)", color: "#059669" },
  policy: { label: "Policy", icon: "📋", bg: "rgba(239, 68, 68, 0.1)", color: "#dc2626" },
  reference: { label: "Reference", icon: "📖", bg: "rgba(107, 114, 128, 0.1)", color: "#6b7280" },
};

const articleStatusConfig = {
  draft: { label: "Draft", bg: "rgba(107, 114, 128, 0.1)", color: "#6b7280" },
  published: { label: "Published", bg: "rgba(16, 185, 129, 0.1)", color: "#059669" },
  archived: { label: "Archived", bg: "rgba(239, 68, 68, 0.1)", color: "#dc2626" },
};

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const toast = useToastHelpers();

  // Fetch articles with filters
  const { data: articlesData = [], isLoading: articlesLoading, refetch } = api.knowledge.getAll.useQuery({
    search: searchQuery || undefined,
    type: filterType as any || undefined,
    status: filterStatus as any || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Fetch knowledge base statistics
  const { data: stats } = api.knowledge.getStats.useQuery();

  // Fetch all available tags
  const { data: allTags = [] } = api.knowledge.getTags.useQuery();

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleArticleClick = (article: any) => {
    setSelectedArticle(article);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("");
    setFilterStatus("");
    setSelectedTags([]);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      
      <main style={{ flex: 1, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg)",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h1 style={{ 
                fontSize: 24, 
                fontWeight: 700, 
                margin: 0,
                color: "var(--text)"
              }}>
                Knowledge Base
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: "var(--text-muted)", 
                margin: "4px 0 0 0" 
              }}>
                {stats ? `${stats.total} articles • ${stats.published} published` : "Loading..."}
              </p>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{
                background: "var(--accent)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📝 New Article
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", 
              gap: 12, 
              marginBottom: 16 
            }}>
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Total Articles
                </div>
              </div>
              
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>
                  {stats.published}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Published
                </div>
              </div>
              
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#6b7280" }}>
                  {stats.draft}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Drafts
                </div>
              </div>
              
              {stats.topViewed && stats.topViewed.length > 0 && (
                <div style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: 12,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#d97706" }}>
                    {stats.topViewed[0].viewCount || 0}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Most Views
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 250 }}>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 14,
                  background: "var(--bg-secondary)",
                  color: "var(--text)",
                }}
              />
              <span style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 16,
                color: "var(--text-muted)",
              }}>
                🔍
              </span>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
              }}
            >
              <option value="">All Types</option>
              {Object.entries(articleTypeConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
              }}
            >
              <option value="">All Status</option>
              {Object.entries(articleStatusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>Tags:</span>
                {allTags.slice(0, 8).map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: selectedTags.includes(tag) ? "var(--accent)" : "var(--bg-secondary)",
                      color: selectedTags.includes(tag) ? "white" : "var(--text-muted)",
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "all 100ms ease",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {(searchQuery || filterType || filterStatus || selectedTags.length > 0) && (
              <button
                onClick={clearFilters}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Article List */}
        <div style={{ 
          padding: "24px", 
          overflow: "auto", 
          height: "calc(100vh - 280px)" 
        }}>
          {articlesLoading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
              Loading articles...
            </div>
          ) : articlesData.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "64px 20px",
              color: "var(--text-muted)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px 0" }}>
                No articles found
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                {searchQuery || filterType || filterStatus || selectedTags.length > 0
                  ? "No articles match your filters" 
                  : "Get started by creating your first knowledge base article"}
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))"
            }}>
              {articlesData.map((article) => {
                const typeConfig = articleTypeConfig[article.type as keyof typeof articleTypeConfig];
                const statusConfig = articleStatusConfig[article.status as keyof typeof articleStatusConfig];
                
                return (
                  <div
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      padding: 20,
                      cursor: "pointer",
                      transition: "all 100ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Article Header */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start",
                      marginBottom: 12
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: 16,
                          fontWeight: 600,
                          margin: 0,
                          color: "var(--text)",
                          marginBottom: 6,
                          lineHeight: 1.3,
                        }}>
                          {article.title}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 11,
                            color: typeConfig.color,
                            background: typeConfig.bg,
                            padding: "2px 6px",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}>
                            {typeConfig.icon} {typeConfig.label}
                          </span>
                          <span style={{
                            fontSize: 11,
                            color: statusConfig.color,
                            background: statusConfig.bg,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
                        👁️ {article.viewCount || 0}
                      </div>
                    </div>

                    {/* Article Summary */}
                    {article.summary && (
                      <p style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        margin: "0 0 12px 0",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {article.summary}
                      </p>
                    )}

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                        {article.tags.slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted)",
                              background: "var(--bg)",
                              padding: "2px 6px",
                              borderRadius: 8,
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 4 && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            +{article.tags.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Article Footer */}
                    <div style={{
                      paddingTop: 12,
                      borderTop: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}>
                      <div>
                        By {article.author?.firstName} {article.author?.lastName}
                      </div>
                      <div>
                        {formatDate(article.updatedAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Article Modal */}
        {showCreateModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              background: "var(--bg-secondary)",
              borderRadius: 12,
              padding: 24,
              width: "90%",
              maxWidth: 600,
              maxHeight: "80vh",
              overflow: "auto",
            }}>
              <h2 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                margin: "0 0 16px 0", 
                color: "var(--text)" 
              }}>
                Create New Article
              </h2>
              
              <div style={{ 
                textAlign: "center", 
                padding: "32px 20px",
                color: "var(--text-muted)"
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
                <p>Article creation form coming soon!</p>
                <p style={{ fontSize: 12 }}>
                  Will include rich text editor, tag management, and publishing workflow.
                </p>
              </div>

              <div style={{ 
                display: "flex", 
                justifyContent: "flex-end", 
                gap: 12,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 16,
                marginTop: 16
              }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Article Detail Modal */}
        {selectedArticle && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              background: "var(--bg-secondary)",
              borderRadius: 12,
              padding: 24,
              width: "90%",
              maxWidth: 800,
              maxHeight: "80vh",
              overflow: "auto",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <h2 style={{ 
                  fontSize: 20, 
                  fontWeight: 600, 
                  margin: 0, 
                  color: "var(--text)",
                  flex: 1,
                  paddingRight: 16,
                }}>
                  {selectedArticle.title}
                </h2>
                <button
                  onClick={() => setSelectedArticle(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* Article meta info */}
              <div style={{ 
                display: "flex", 
                gap: 12, 
                marginBottom: 16,
                fontSize: 12,
                color: "var(--text-muted)"
              }}>
                <span>By {selectedArticle.author?.firstName} {selectedArticle.author?.lastName}</span>
                <span>•</span>
                <span>{formatDate(selectedArticle.updatedAt)}</span>
                <span>•</span>
                <span>{selectedArticle.viewCount || 0} views</span>
              </div>

              {/* Article content preview */}
              <div style={{ 
                padding: "16px 0",
                borderTop: "1px solid var(--border-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
                margin: "16px 0",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-secondary)",
              }}>
                <p>{selectedArticle.summary || "No summary available"}</p>
                <div style={{ 
                  background: "var(--bg)", 
                  padding: 12, 
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                }}>
                  Content preview: {selectedArticle.content.substring(0, 200)}...
                </div>
              </div>

              <div style={{ 
                display: "flex", 
                justifyContent: "flex-end", 
                gap: 12 
              }}>
                <button
                  onClick={() => {
                    setSelectedArticle(null);
                    toast.success("Article Opened", `Viewing ${selectedArticle.title}`);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "var(--accent)",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  View Full Article
                </button>
                <button
                  onClick={() => setSelectedArticle(null)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}