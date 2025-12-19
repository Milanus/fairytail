"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { subscribeToStories, Story } from "../../lib/realtime";
import { getCurrentUser } from "../../lib/auth";
import { database } from "../../lib/firebase";
import { ref, remove, set, get } from "firebase/database";

export default function BrowseClient() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const sortOptions = [
  { value: "newest", label: "✨ Nejnovější" },
  { value: "oldest", label: "🕰️ Nejstarší" },
  { value: "topRated", label: "⭐ Nejlépe hodnocené" },
  ];
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const STORIES_PER_PAGE = 6;

  useEffect(() => {
    // Check user authentication and admin status
    const checkUserStatus = async () => {
      const user = getCurrentUser();
      setCurrentUser(user ? { name: user.displayName } : null);
      setIsAdmin(user?.isAdmin || false);

      // Load user's likes if authenticated
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
        }
      }
    };
    checkUserStatus();
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToStories((data) => {
      const withSort = [...(data || [])];
      
      // Helper function to get created_at value
      const getCreatedAt = (story: Story): number => {
        const raw = (story as any).created_at ?? (story as any).createdAt;
        if (typeof raw === "number") return raw;
        if (typeof raw === "string") {
          const parsed = Date.parse(raw);
          return Number.isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      // Helper function to get likes value
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

  // Filter stories based on search term, selected tag, and selected author
  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (story.excerpt && story.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          story.author.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = selectedTag === "" || (story.tags || []).includes(selectedTag) || story.category === selectedTag;

    const matchesAuthor = selectedAuthor === "" || story.author === selectedAuthor;

    return matchesSearch && matchesTag && matchesAuthor;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE);
  const startIndex = (currentPage - 1) * STORIES_PER_PAGE;
  const endIndex = startIndex + STORIES_PER_PAGE;
  const paginatedStories = filteredStories.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get unique tags and authors for filter dropdowns
  const allTags = [...new Set(stories.flatMap(story => story.tags || []))];
  const allAuthors = [...new Set(stories.map(story => story.author))].sort();

  const handleDeleteStory = async (storyId: string) => {
    if (confirm("Are you sure you want to delete this story?")) {
      try {
        const storyRef = ref(database, `fairy_tales/${storyId}`);
        await remove(storyRef);
        // The realtime subscription will automatically update the UI
      } catch (error) {
        alert("Failed to delete story. Please try again.");
      }
    }
  };

  const handleLikeStory = async (storyId: string) => {
    if (!currentUser) {
      alert("Please login to like stories.");
      return;
    }

    const isLiked = userLikes.has(storyId);
    const newLikes = new Set(userLikes);

    try {
      if (isLiked) {
        // Unlike the story
        newLikes.delete(storyId);
        const likeRef = ref(database, `user_likes/${currentUser.name}/${storyId}`);
        await remove(likeRef);
      } else {
        // Like the story
        newLikes.add(storyId);
        const likeRef = ref(database, `user_likes/${currentUser.name}/${storyId}`);
        await set(likeRef, {
          likedAt: Date.now(),
          storyId: storyId
        });
      }

      setUserLikes(newLikes);

      // Update story like count
      const story = stories.find(s => s.id === storyId);
      if (story) {
        const newLikeCount = isLiked ? (story.likes_count || 0) - 1 : (story.likes_count || 0) + 1;
        const storyRef = ref(database, `fairy_tales/${storyId}/likes_count`);
        await set(storyRef, newLikeCount);
      }
    } catch (error) {
      alert("Failed to update like. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📚</div>
          <p className="text-xl text-amber-700 animate-pulse">Načítání pohádek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">Hledat příběhy</label>
            <input
              type="text"
              id="search"
              placeholder="Hledat příběhy, autory..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-black placeholder:text-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Author Filter */}
            <div>
              <label htmlFor="author-filter" className="block text-sm font-medium text-black mb-1">Filtrovat podle autora</label>
              <select
                id="author-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-black bg-white"
                value={selectedAuthor}
                onChange={(e) => setSelectedAuthor(e.target.value)}
              >
                <option value=""className="text-black">Všichni autoři</option>
                {allAuthors.map(author => (
                  <option key={author} value={author}>{author}</option>
                ))}
              </select>
            </div>
            
            {/* Tag Filter */}
            <div>
              <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrovat podle štítku</label>
              <select
                id="tag-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-black bg-white"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">Všechny štítky</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">Řadit podle</label>
              <select
                id="sort"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-black bg-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                 {sortOptions.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
              </select>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Kategorie pohádek</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* All Fairy Tales Button - First */}
            <button
              onClick={() => setSelectedTag("")}
              className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 border ${
                selectedTag === ""
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-amber-100'
              }`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Všechny pohádky</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Zobrazit všechny pohádky bez filtru</p>
              </div>
            </button>

            {[
              {
                emoji: "🦊",
                title: "Zvířecí pohádky",
                description: "o liškách, pejscích, koťátkách, lese, farmě",
                categoryId: "1"
              },
              {
                emoji: "👑",
                title: "Kráľovství a princezny",
                description: "klasické pohádky o princeznách, kráľoch a zámkoch",
                categoryId: "2"
              },
              {
                emoji: "🐉",
                title: "Draci a kouzla",
                description: "čarovné bytosti, kouzla, čarodějové, dobrodružství",
                categoryId: "3"
              },
              {
                emoji: "🚀",
                title: "Dobrodružné příběhy",
                description: "cestovanie, hrdinovia, napätie, nové svety",
                categoryId: "4"
              },
              {
                emoji: "🌿",
                title: "Příběhy z přírody",
                description: "les, voda, hory, ročné obdobia, zvieratká v lese",
                categoryId: "5"
              },
              {
                emoji: "❤️",
                title: "Pohádky o přátelství a lásce",
                description: "o kamarádstve, pomoci, dobrote",
                categoryId: "6"
              },
              {
                emoji: "😂",
                title: "Veselé pohádky",
                description: "krátke, vtipné, absurdné alebo hravé",
                categoryId: "7"
              },
              {
                emoji: "🌙",
                title: "Pohádky na dobrou noc",
                description: "krátke, pokojné, vhodné na čítanie pred spaním",
                categoryId: "8"
              },
              {
                emoji: "🦕",
                title: "Dinosauří pohádky",
                description: "o dinosaurech, pravěku, dobrodružstvích v minulosti",
                categoryId: "9"
              },
              {
                emoji: "🦉",
                title: "Chytré zvířecí pohádky",
                description: "o moudrých zvířatech, vlcích, liškách, sovách",
                categoryId: "10"
              }
            ].map((category, index) => (
              <button
                key={index}
                onClick={() => setSelectedTag(category.categoryId)}
                className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 border ${
                  selectedTag === category.categoryId
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-amber-100'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">{category.emoji}</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{category.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{category.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Stories Grid */}
        {paginatedStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedStories.map((story) => (
              <div key={story.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition flex flex-col">
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-normal text-black font-serif leading-tight">{story.title}</h3>
                    <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
                      ✨ {story.likes_count || 0} likes
                    </span>
                  </div>

                  {/* Video Preview */}
                  {story.video_url && (() => {
                    const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]+)/;
                    const match = story.video_url.match(youtubeRegex);
                    if (match && match[1]) {
                      return (
                        <div className="mb-4">
                          <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-red-200">
                            <iframe
                              src={`https://www.youtube.com/embed/${match[1]}`}
                              title="YouTube video preview"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute inset-0 w-full h-full"
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-red-600 text-sm font-medium">🎬</span>
                            <span className="text-red-600 text-sm">Video k pohádce</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {story.description && (
                    <div className="text-gray-800 mb-3 italic text-sm font-normal">
                      {story.description.split('\n').map((line, index) => (
                        <p key={index} className={index > 0 ? 'mt-2' : ''}>{line}</p>
                      ))}
                    </div>
                  )}
                  <div className="text-gray-800 mb-4 flex-1 leading-relaxed">
                    {story.excerpt && story.excerpt.split('\n').map((line, index) => (
                      <p key={index} className={`text-base font-normal font-serif ${index > 0 ? 'mt-3' : ''}`}>{line}</p>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-500">od {story.author}</span>
                    <span className="text-sm text-gray-500">{story.views_count} zobrazení</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {story.tags && story.tags.map((tag, index) => (
                      <span key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-xs font-medium px-2 py-1 rounded border border-amber-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-sm text-gray-500">{story.created_at ? new Date(typeof story.created_at === 'number' ? story.created_at : Date.parse(String(story.created_at))).toLocaleDateString() : ''}</span>
                    <div className="flex items-center space-x-2">
                      <Link href={`/story/${story.id}`} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-serif font-semibold shadow-xl text-lg">
                        ✨ Číst pohádku ✨
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          title="Delete story (Admin only)"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Nebyly nalezeny žádné příběhy odpovídající vašim kritériím. Zkuste upravit vyhledávání nebo filtr.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Předchozí
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-4 py-2 rounded-lg transition ${
                    page === currentPage
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Další →
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}