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
                          story.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          story.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === "" || (story.tags || []).includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

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
      {/* Enchanted Forest Header */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800">
          {/* Enchanted Stars */}
          <div className="absolute inset-0">
            {[...Array(25)].map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 6}s`,
                  animationDuration: `${4 + Math.random() * 3}s`
                }}
              >
                <div
                  className="bg-white rounded-full opacity-50 animate-pulse"
                  style={{
                    width: `${1 + Math.random() * 1.5}px`,
                    height: `${1 + Math.random() * 1.5}px`,
                  }}
                ></div>
              </div>
            ))}
          </div>

          {/* Magical Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-8 left-12 opacity-25" style={{ animationDelay: '1s', animationDuration: '6s' }}>
              <div className="text-amber-200 text-lg">✨</div>
            </div>
            <div className="absolute top-16 right-16 opacity-20" style={{ animationDelay: '3s', animationDuration: '8s' }}>
              <div className="text-yellow-200 text-xl">🌟</div>
            </div>
            <div className="absolute bottom-12 left-20 opacity-30" style={{ animationDelay: '5s', animationDuration: '7s' }}>
              <div className="text-amber-300 text-base">⭐</div>
            </div>
          </div>
        </div>

        <div className="relative container mx-auto px-4 text-center text-white">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Procházet Pohádky
            </h1>
            <div className="flex justify-center items-center space-x-4 mb-6">
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
              <div className="text-amber-200 text-xl animate-pulse">📚</div>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
            </div>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
              Objevte kouzelné příběhy z naší sbírky. Filtrujte podle štítků a najděte svou další oblíbenou pohádku.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Hledat</label>
              <input
                type="text"
                id="search"
                placeholder="Hledat příběhy, autory..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Tag Filter */}
            <div>
              <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrovat podle štítku</label>
              <select
                id="tag-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Nejnovější první</option>
                <option value="popular">Nejoblíbenější</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Stories Grid */}
        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => (
              <div key={story.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{story.title}</h3>
                    <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-200">
                      {story.likes_count || 0} likes
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{story.excerpt}</p>
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
                  <div className="flex justify-between items-center">
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
        <div className="flex justify-center mt-8">
          <nav className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 rounded-lg hover:from-amber-400 hover:to-yellow-500 transition shadow-lg">
              1
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition">
              2
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition">
              Další →
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}