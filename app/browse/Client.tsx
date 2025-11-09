"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { subscribeToStories, Story } from "../../lib/realtime";
import { getCurrentUserWithAdmin } from "../../lib/auth";
import { database } from "../../lib/firebase";
import { ref, remove, set, get } from "firebase/database";

export default function BrowseClient() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const STORIES_PER_PAGE = 6;

  useEffect(() => {
    // Check user authentication and admin status
    const checkUserStatus = async () => {
      const user = await getCurrentUserWithAdmin();
      setCurrentUser(user);
      setIsAdmin(user?.isAdmin || false);

      // Load user's likes if authenticated
      if (user) {
        try {
          const likesRef = ref(database, `user_likes/${user.name}`);
          const likesSnapshot = await get(likesRef);
          if (likesSnapshot.exists()) {
            const likesData = likesSnapshot.val();
            const likedStoryIds = new Set(Object.keys(likesData));
            setUserLikes(likedStoryIds);
          }
        } catch (error) {
          console.error("Error loading user likes:", error);
        }
      }
    };
    checkUserStatus();
  }, []);

  useEffect(() => {
    setLoading(true);

    // Use realtime subscription (updates automatically)
    const unsubscribe = subscribeToStories((data: Story[]) => {
      // optional sorting client-side
      let items: Story[] = data || [];
      if (sortBy === "newest") {
        items = items.sort((a: Story, b: Story) => {
          const ta = typeof a.created_at === "number" ? a.created_at : Date.parse(String(a.created_at) || "0");
          const tb = typeof b.created_at === "number" ? b.created_at : Date.parse(String(b.created_at) || "0");
          return tb - ta;
        });
      } else if (sortBy === "popular") {
        items = items.sort((a: Story, b: Story) => (b.likes_count || 0) - (a.likes_count || 0));
      }
      setStories(items);
      setLoading(false);
    }, "published"); // Only show published stories

    return () => {
      unsubscribe(); // cleanup realtime listener
    };
  }, [sortBy]);

  // Filter stories based on search term and selected tag
  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (story.excerpt && story.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          story.author.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = selectedTag === "" || (story.tags || []).includes(selectedTag) || story.category === selectedTag;

    return matchesSearch && matchesTag;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE);
  const startIndex = (currentPage - 1) * STORIES_PER_PAGE;
  const endIndex = startIndex + STORIES_PER_PAGE;
  const paginatedStories = filteredStories.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get unique tags for filter dropdown
  const allTags = [...new Set(stories.flatMap(story => story.tags || []))];

  const handleDeleteStory = async (storyId: string) => {
    if (confirm("Are you sure you want to delete this story?")) {
      try {
        const storyRef = ref(database, `fairy_tales/${storyId}`);
        await remove(storyRef);
        // The realtime subscription will automatically update the UI
      } catch (error) {
        console.error("Error deleting story:", error);
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
      console.error("Error updating like:", error);
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tag Filter */}
            <div>
              <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrovat podle štítku</label>
              <select
                id="tag-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Nejnovější první</option>
                <option value="popular">Nejoblíbenější</option>
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
                    <h3 className="text-xl font-bold text-gray-800">{story.title}</h3>
                    <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-200">
                      {story.likes_count || 0} likes
                    </span>
                  </div>
                  {story.description && (
                    <p className="text-gray-700 mb-2 italic text-sm">{story.description}</p>
                  )}
                  <p className="text-gray-600 mb-4 flex-1">{story.excerpt}</p>
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
                      <Link href={`/story/${story.id}`} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-medium shadow-lg">
                        📖 Číst více
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