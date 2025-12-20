"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { subscribeToStories, Story } from "../../lib/realtime";
import { getCurrentUser } from "../../lib/auth";
import { database } from "../../lib/firebase";
import { ref, remove, set, get } from "firebase/database";

// Category data
const CATEGORIES = [
  { id: "", emoji: "📚", title: "Všechny pohádky", description: "Zobrazit všechny pohádky" },
  { id: "1", emoji: "🦊", title: "Zvířecí pohádky", description: "O liškách, pejscích, koťátkách" },
  { id: "2", emoji: "👑", title: "Království a princezny", description: "Klasické pohádky o princeznách" },
  { id: "3", emoji: "🐉", title: "Draci a kouzla", description: "Čarovné bytosti a dobrodružství" },
  { id: "4", emoji: "🚀", title: "Dobrodružné příběhy", description: "Cestování a hrdinové" },
  { id: "5", emoji: "🌿", title: "Příběhy z přírody", description: "Les, voda, hory" },
  { id: "6", emoji: "❤️", title: "O přátelství a lásce", description: "O kamarádství a dobrotě" },
  { id: "7", emoji: "😂", title: "Veselé pohádky", description: "Vtipné a hravé příběhy" },
  { id: "8", emoji: "🌙", title: "Na dobrou noc", description: "Pokojné příběhy před spaním" },
  { id: "9", emoji: "🦕", title: "Dinosauří pohádky", description: "O dinosaurech a pravěku" },
  { id: "10", emoji: "🦉", title: "Chytré zvířecí", description: "O moudrých zvířatech" },
];

export default function BrowseClient() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const STORIES_PER_PAGE = 9;

  const sortOptions = [
    { value: "newest", label: "Nejnovější", icon: "✨" },
    { value: "oldest", label: "Nejstarší", icon: "🕰️" },
    { value: "topRated", label: "Nejoblíbenější", icon: "⭐" },
  ];

  useEffect(() => {
    const checkUserStatus = async () => {
      const user = getCurrentUser();
      setCurrentUser(user ? { name: user.displayName } : null);
      setIsAdmin(user?.isAdmin || false);

      if (user) {
        try {
          const likesRef = ref(database, `user_likes/${user.displayName}`);
          const likesSnapshot = await get(likesRef);
          if (likesSnapshot.exists()) {
            const likesData = likesSnapshot.val();
            const likedStoryIds = new Set(Object.keys(likesData));
            setUserLikes(likedStoryIds);
          }
        } catch (error) {
          console.error("Error loading likes:", error);
        }
      }
    };
    checkUserStatus();
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToStories((data) => {
      const withSort = [...(data || [])];
      
      const getCreatedAt = (story: Story): number => {
        const raw = (story as any).created_at ?? (story as any).createdAt;
        if (typeof raw === "number") return raw;
        if (typeof raw === "string") {
          const parsed = Date.parse(raw);
          return Number.isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      const getLikes = (story: Story): number => {
        return (story as any).likes_count ?? (story as any).likes ?? 0;
      };

      if (sortBy === "newest") {
        withSort.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
      } else if (sortBy === "oldest") {
        withSort.sort((a, b) => getCreatedAt(a) - getCreatedAt(b));
      } else if (sortBy === "topRated") {
        withSort.sort((a, b) => getLikes(b) - getLikes(a));
      }
      
      setStories(withSort);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedAuthor, sortBy]);

  // Filter stories
  const filteredStories = useMemo(() => {
    return stories.filter(story => {
      const matchesSearch = searchTerm === "" || 
        story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (story.excerpt && story.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
        story.author.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "" || 
        (story.tags || []).includes(selectedCategory) || 
        story.category === selectedCategory;

      const matchesAuthor = selectedAuthor === "" || story.author === selectedAuthor;

      return matchesSearch && matchesCategory && matchesAuthor;
    });
  }, [stories, searchTerm, selectedCategory, selectedAuthor]);

  // Pagination
  const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE);
  const paginatedStories = filteredStories.slice(
    (currentPage - 1) * STORIES_PER_PAGE,
    currentPage * STORIES_PER_PAGE
  );

  // Get unique authors
  const allAuthors = useMemo(() => 
    [...new Set(stories.map(story => story.author))].sort(),
    [stories]
  );

  // Active filters count
  const activeFiltersCount = [selectedCategory, selectedAuthor, searchTerm].filter(Boolean).length;

  const handleDeleteStory = async (storyId: string) => {
    if (confirm("Opravdu chcete smazat tento příběh?")) {
      try {
        const storyRef = ref(database, `fairy_tales/${storyId}`);
        await remove(storyRef);
      } catch (error) {
        alert("Nepodařilo se smazat příběh. Zkuste to prosím znovu.");
      }
    }
  };

  const handleLikeStory = async (storyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      alert("Pro hodnocení příběhů se prosím přihlaste.");
      return;
    }

    const isLiked = userLikes.has(storyId);
    const newLikes = new Set(userLikes);

    try {
      if (isLiked) {
        newLikes.delete(storyId);
        const likeRef = ref(database, `user_likes/${currentUser.name}/${storyId}`);
        await remove(likeRef);
      } else {
        newLikes.add(storyId);
        const likeRef = ref(database, `user_likes/${currentUser.name}/${storyId}`);
        await set(likeRef, { likedAt: Date.now(), storyId });
      }

      setUserLikes(newLikes);

      const story = stories.find(s => s.id === storyId);
      if (story) {
        const newLikeCount = isLiked ? (story.likes_count || 0) - 1 : (story.likes_count || 0) + 1;
        const storyRef = ref(database, `fairy_tales/${storyId}/likes_count`);
        await set(storyRef, newLikeCount);
      }
    } catch (error) {
      alert("Nepodařilo se aktualizovat hodnocení. Zkuste to prosím znovu.");
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedAuthor("");
    setSortBy("newest");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-amber-200 rounded-full animate-spin border-t-amber-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl animate-pulse">📖</span>
            </div>
          </div>
          <p className="mt-6 text-xl text-amber-700 font-serif animate-pulse">Načítání kouzelných příběhů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-amber-600 text-xl">🔍</span>
              <input
                type="text"
                placeholder="Hledat pohádky, autory..."
                className="w-full pl-12 pr-12 py-4 bg-white border-2 border-amber-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-lg shadow-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 text-gray-400 hover:text-gray-600 transition text-xl"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-sm ${
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-200"
                    : "bg-white text-gray-700 hover:bg-amber-50 hover:text-amber-700 border border-amber-200"
                }`}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.title}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 shadow-sm ${
                showFilters
                  ? "bg-amber-100 text-amber-700 border-2 border-amber-400"
                  : "bg-white text-gray-700 hover:bg-amber-50 border border-amber-200"
              }`}
            >
              <span>⚙️</span>
              Více filtrů
              {activeFiltersCount > 0 && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expanded Filters Panel */}
        {showFilters && (
          <div className="mb-8 animate-in slide-in-from-top duration-300">
            <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h3 className="text-gray-800 font-serif text-lg flex items-center gap-2">
                  <span>🎯</span> Pokročilé filtry
                </h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-amber-600 hover:text-amber-700 transition flex items-center gap-1"
                  >
                    <span>✕</span> Vymazat vše
                  </button>
                )}
              </div>

              {/* All Categories Grid */}
              <div className="mb-6">
                <label className="block text-gray-600 text-sm mb-3 font-medium">Kategorie</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-3 rounded-xl text-center transition-all duration-300 ${
                        selectedCategory === cat.id
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg"
                          : "bg-amber-50 text-gray-700 hover:bg-amber-100 border border-amber-100 hover:border-amber-300"
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.emoji}</div>
                      <div className="text-xs font-medium truncate">{cat.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Author Filter */}
                <div>
                  <label className="block text-gray-600 text-sm mb-2 font-medium">Autor</label>
                  <select
                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer"
                    value={selectedAuthor}
                    onChange={(e) => setSelectedAuthor(e.target.value)}
                  >
                    <option value="">Všichni autoři</option>
                    {allAuthors.map(author => (
                      <option key={author} value={author}>{author}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-gray-600 text-sm mb-2 font-medium">Řazení</label>
                  <select
                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* View Mode */}
                <div>
                  <label className="block text-gray-600 text-sm mb-2 font-medium">Zobrazení</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`flex-1 px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                        viewMode === "grid"
                          ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md"
                          : "bg-amber-50 text-gray-700 hover:bg-amber-100 border border-amber-200"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Mřížka
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`flex-1 px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                        viewMode === "list"
                          ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md"
                          : "bg-amber-50 text-gray-700 hover:bg-amber-100 border border-amber-200"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      Seznam
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="text-gray-600">
            <span className="text-amber-600 font-semibold">{filteredStories.length}</span> pohádek nalezeno
            {selectedCategory && (
              <span className="ml-2 inline-flex items-center gap-1 px-3 py-1 bg-amber-100 rounded-full text-sm text-amber-700">
                {CATEGORIES.find(c => c.id === selectedCategory)?.emoji}
                {CATEGORIES.find(c => c.id === selectedCategory)?.title}
                <button onClick={() => setSelectedCategory("")} className="ml-1 hover:text-amber-900">✕</button>
              </span>
            )}
          </div>
          
          {/* Quick Sort Buttons */}
          <div className="flex items-center gap-2">
            {sortOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  sortBy === option.value
                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stories Grid/List */}
        {paginatedStories.length > 0 ? (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "flex flex-col gap-4"
          }>
            {paginatedStories.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.id}`}
                className={`group relative bg-white rounded-2xl overflow-hidden border border-amber-100 hover:border-amber-300 transition-all duration-300 hover:shadow-xl hover:shadow-amber-100 hover:-translate-y-1 ${
                  viewMode === "list" ? "flex" : ""
                }`}
              >
                {/* Decorative gradient corner */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full opacity-50"></div>
                
                <div className={`p-6 flex flex-col ${viewMode === "list" ? "flex-row flex-1 items-center gap-6" : ""}`}>
                  {/* Header */}
                  <div className={`${viewMode === "list" ? "flex-1" : "mb-4"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-xl font-serif font-semibold text-gray-800 group-hover:text-amber-700 transition line-clamp-2">
                        {story.title}
                      </h3>
                      <button
                        onClick={(e) => handleLikeStory(story.id, e)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all shrink-0 ${
                          userLikes.has(story.id)
                            ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md"
                            : "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                        }`}
                      >
                        <span>{userLikes.has(story.id) ? "❤️" : "🤍"}</span>
                        <span>{story.likes_count || 0}</span>
                      </button>
                    </div>

                    {/* Description/Excerpt */}
                    {(story.description || story.excerpt) && (
                      <p className={`text-gray-600 text-sm leading-relaxed ${viewMode === "grid" ? "line-clamp-3 mb-4" : "line-clamp-2"}`}>
                        {story.description || story.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {story.tags && story.tags.length > 0 && (
                    <div className={`flex flex-wrap gap-2 ${viewMode === "list" ? "" : "mb-4"}`}>
                      {story.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-xs rounded-lg border border-amber-200"
                        >
                          {CATEGORIES.find(c => c.id === tag)?.emoji || "📖"} {CATEGORIES.find(c => c.id === tag)?.title || tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className={`flex items-center justify-between pt-4 border-t border-amber-100 ${viewMode === "list" ? "ml-auto pl-6 border-t-0 border-l" : "mt-auto"}`}>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span>✍️</span>
                        {story.author}
                      </span>
                      {story.views_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <span>👁️</span>
                          {story.views_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {story.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(typeof story.created_at === 'number' ? story.created_at : Date.parse(String(story.created_at))).toLocaleDateString('cs-CZ')}
                        </span>
                      )}
                      <span className="text-amber-500 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdmin && (
                    <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/edit/${story.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition shadow-md"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteStory(story.id);
                        }}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs transition shadow-md"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔮</div>
            <h3 className="text-2xl font-serif text-gray-800 mb-2">Žádné pohádky nenalezeny</h3>
            <p className="text-gray-500 mb-6">Zkuste upravit vyhledávání nebo filtry</p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full font-medium hover:from-amber-400 hover:to-yellow-500 transition shadow-lg"
            >
              Zobrazit všechny pohádky
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-12">
            <nav className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-lg border border-amber-100">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl text-gray-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <span>←</span>
                <span className="hidden sm:inline">Předchozí</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, arr) => {
                    const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-xl transition-all ${
                            page === currentPage
                              ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold shadow-md"
                              : "text-gray-700 hover:bg-amber-50"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl text-gray-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <span className="hidden sm:inline">Další</span>
                <span>→</span>
              </button>
            </nav>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-8 border border-amber-200 shadow-lg">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-2xl font-serif text-gray-800 mb-2">Máte vlastní pohádku?</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Sdílejte svůj příběh s ostatními a staňte se součástí naší kouzelné komunity
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full font-semibold hover:from-amber-400 hover:to-yellow-500 transition shadow-lg hover:shadow-xl"
            >
              <span>🪶</span>
              Napsat pohádku
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
