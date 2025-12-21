"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth";
import { database, deleteFromStorage } from "../../lib/firebase";
import { ref, get, remove, set } from "firebase/database";
import { fetchStoriesOnce, Story as RealtimeStory } from "../../lib/realtime";
import Hero from "../../components/Hero";

interface Story {
  id: string;
  title: string;
  author: string;
  content: string;
  status: string;
  created_at: number;
  tags: string[];
  excerpt?: string;
  description?: string;
  likes_count?: number;
  views_count?: number;
}

interface FavoriteStory extends Story {
  favorited_at: number;
}

// Tab types
type TabType = "stories" | "favorites";

export default function UserPage() {
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userExists, setUserExists] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [favoriteStories, setFavoriteStories] = useState<FavoriteStory[]>([]);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("stories");
  const [favoriteSearchTerm, setFavoriteSearchTerm] = useState<string>("");
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = getCurrentUser();

      if (currentUser) {
        setUserName(currentUser.displayName);
        setUserId(currentUser.uid);
        setIsAdmin(currentUser.isAdmin);
        setUserExists(true);

        // Fetch user's stories
        try {
          const allStories = await fetchStoriesOnce();
          const userStoriesFiltered = allStories.filter(story => story.author === currentUser.displayName);
          setUserStories(userStoriesFiltered as Story[]);

          // Fetch user's likes (favorites) - using displayName as key (same as browse page)
          const likesRef = ref(database, `user_likes/${currentUser.displayName}`);
          const likesSnapshot = await get(likesRef);
          
          if (likesSnapshot.exists()) {
            const likesData = likesSnapshot.val();
            const likedStoryIds = Object.keys(likesData);
            
            // Get the liked stories with their likedAt timestamps
            const favStories: FavoriteStory[] = [];
            for (const storyId of likedStoryIds) {
              const story = allStories.find(s => s.id === storyId);
              if (story && story.status === 'published') {
                favStories.push({
                  ...story as Story,
                  favorited_at: likesData[storyId].likedAt || likesData[storyId].favorited_at || Date.now()
                });
              }
            }
            
            // Sort by favorited_at (newest first)
            favStories.sort((a, b) => b.favorited_at - a.favorited_at);
            setFavoriteStories(favStories);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }

      setLoading(false);
    };

    fetchUser();
  }, []);

  // Filter favorites based on search term
  const filteredFavorites = useMemo(() => {
    if (!favoriteSearchTerm.trim()) {
      return favoriteStories;
    }
    
    const searchLower = favoriteSearchTerm.toLowerCase();
    return favoriteStories.filter(story =>
      story.title.toLowerCase().includes(searchLower) ||
      story.author.toLowerCase().includes(searchLower) ||
      (story.excerpt && story.excerpt.toLowerCase().includes(searchLower)) ||
      (story.description && story.description.toLowerCase().includes(searchLower)) ||
      (story.tags && story.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  }, [favoriteStories, favoriteSearchTerm]);

  // Remove from favorites (likes)
  const handleRemoveFromFavorites = async (storyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userName) return;
    
    try {
      // Remove from user_likes (using displayName as key, same as browse page)
      const likeRef = ref(database, `user_likes/${userName}/${storyId}`);
      await remove(likeRef);
      
      // Also update the story's likes_count
      const story = favoriteStories.find(s => s.id === storyId);
      if (story && story.likes_count !== undefined && story.likes_count > 0) {
        const storyLikesRef = ref(database, `fairy_tales/${storyId}/likes_count`);
        await set(storyLikesRef, story.likes_count - 1);
      }
      
      setFavoriteStories(prev => prev.filter(s => s.id !== storyId));
    } catch (error) {
      console.error("Error removing from favorites:", error);
      alert("Nepodařilo se odebrat z oblíbených. Zkuste to prosím znovu.");
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (confirm("Are you sure you want to delete this story?")) {
      try {
        // First, get the story data to access file URLs
        const storyRef = ref(database, `fairy_tales/${storyId}`);
        const storySnapshot = await get(storyRef);
        if (storySnapshot.exists()) {
          const storyData = storySnapshot.val();

          // Delete associated files from storage
          const filesToDelete = [];
          if (storyData.story_image_url) filesToDelete.push(storyData.story_image_url);
          if (storyData.audio_url) filesToDelete.push(storyData.audio_url);
          if (Array.isArray(storyData.image_urls)) {
            filesToDelete.push(...storyData.image_urls);
          }

          // Delete files from storage (don't block on errors)
          const deletePromises = filesToDelete.map(url => deleteFromStorage(url).catch(() => {}));
          await Promise.allSettled(deletePromises);
        }

        // Delete the story from database
        await remove(storyRef);
        setUserStories(userStories.filter(s => s.id !== storyId));
      } catch (error) {
        alert("Failed to delete story. Please try again.");
      }
    }
  };

  const handlePreviewStory = (story: Story) => {
    setPreviewStory(story);
  };

  const handleLogout = async () => {
    try {
      // Import the new logout function
      const { signOutUser } = await import("../../lib/auth");
      await signOutUser();
      
      // Clear local state
      setUserName("");
      setIsAdmin(false);
      setUserExists(false);
      setUserStories([]);
      
      // Redirect to home
      router.push("/");
    } catch (error) {
      alert("Failed to logout. Please try again.");
    }
  };

  if (loading) {
    return (
      <>
        <Hero title="Můj Profil" subtitle="Načítání..." height="sm" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-3xl font-bold text-black mb-6">Loading...</h1>
            <p className="text-gray-600">Verifying your account</p>
          </div>
        </div>
      </>
    );
  }

  if (previewStory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">Story Preview</h1>
                <button
                  onClick={() => setPreviewStory(null)}
                  className="text-gray-600 hover:text-purple-800 font-medium"
                >
                  ← Back to Profile
                </button>
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-4">{previewStory.title}</h2>

              <div className="flex flex-wrap items-center justify-between mb-6">
                <div className="flex items-center">
                  <span className="text-gray-600">by</span>
                  <span className="ml-2 font-medium text-amber-700">{previewStory.author}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    previewStory.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : previewStory.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {previewStory.status}
                  </span>
                  <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
                    0 likes
                  </span>
                  <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
                    0 views
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {previewStory.tags && previewStory.tags.map((tag, index) => (
                  <span key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-sm font-medium px-3 py-1 rounded-full border border-amber-200">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="prose max-w-none text-gray-800">
                {previewStory.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Created: {new Date(previewStory.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userExists) {
    return (
      <>
        <Hero
          title="Můj Profil"
          subtitle={`Vítejte, ${userName}!`}
          height="sm"
        />
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
          <div className="container mx-auto px-4 py-8">
            {/* Profile Header Card */}
            <div className="max-w-5xl mx-auto mb-8">
              <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 h-24"></div>
                <div className="px-6 pb-6 -mt-12">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-white">
                      👤
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h1 className="text-2xl font-bold text-gray-800 font-serif">{userName}</h1>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium mt-1">
                          <span>👑</span> Admin
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-6 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full hover:from-gray-200 hover:to-gray-300 transition shadow-md font-medium"
                    >
                      Odhlásit se
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="max-w-5xl mx-auto mb-6">
              <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("stories")}
                    className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeTab === "stories"
                        ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                    }`}
                  >
                    <span>📝</span>
                    Moje pohádky
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === "stories" ? "bg-white/20" : "bg-amber-100 text-amber-700"
                    }`}>
                      {userStories.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("favorites")}
                    className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeTab === "favorites"
                        ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                    }`}
                  >
                    <span>❤️</span>
                    Oblíbené pohádky
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === "favorites" ? "bg-white/20" : "bg-amber-100 text-amber-700"
                    }`}>
                      {favoriteStories.length}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-5xl mx-auto">
              {/* My Stories Tab */}
              {activeTab === "stories" && (
                <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
                      <span>📚</span> Moje pohádky
                    </h2>
                    <Link
                      href="/submit"
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-md font-medium flex items-center gap-2"
                    >
                      <span>✨</span> Napsat novou
                    </Link>
                  </div>

                  {userStories.length > 0 ? (
                    <div className="space-y-4">
                      {userStories.map((story) => (
                        <div key={story.id} className="group border border-amber-100 rounded-xl p-5 hover:border-amber-300 hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-amber-50/30">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-xl font-serif font-semibold text-gray-800 group-hover:text-amber-700 transition">
                              {story.title}
                            </h3>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              story.status === 'published'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : story.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {story.status === 'published' ? '✓ Publikováno' : story.status === 'pending' ? '⏳ Čeká na schválení' : story.status}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-4 line-clamp-2">{story.content.substring(0, 200)}...</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {story.tags && story.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-xs rounded-lg border border-amber-200">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-amber-100">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <span>📅</span>
                              {new Date(story.created_at).toLocaleDateString('cs-CZ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePreviewStory(story)}
                                className="px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition flex items-center gap-1"
                              >
                                <span>👁️</span> Náhled
                              </button>
                              <button
                                onClick={() => router.push(`/edit/${story.id}`)}
                                className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
                              >
                                <span>✏️</span> Upravit
                              </button>
                              <button
                                onClick={() => handleDeleteStory(story.id)}
                                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                              >
                                <span>🗑️</span> Smazat
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📖</div>
                      <h3 className="text-xl font-serif text-gray-800 mb-2">Zatím nemáte žádné pohádky</h3>
                      <p className="text-gray-500 mb-6">Začněte psát svůj první kouzelný příběh!</p>
                      <Link
                        href="/submit"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full font-medium hover:from-amber-400 hover:to-yellow-500 transition shadow-lg"
                      >
                        <span>🪶</span> Napsat první pohádku
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Favorites Tab */}
              {activeTab === "favorites" && (
                <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
                      <span>❤️</span> Oblíbené pohádky
                    </h2>
                    
                    {/* Search Filter */}
                    <div className="w-full sm:w-auto">
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-amber-600">🔍</span>
                          <input
                            type="text"
                            placeholder="Hledat v oblíbených..."
                            className="w-full sm:w-72 pl-10 pr-10 py-2.5 bg-white border-2 border-amber-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                            value={favoriteSearchTerm}
                            onChange={(e) => setFavoriteSearchTerm(e.target.value)}
                          />
                          {favoriteSearchTerm && (
                            <button
                              onClick={() => setFavoriteSearchTerm("")}
                              className="absolute right-3 text-gray-400 hover:text-gray-600 transition"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Results Info */}
                  {favoriteSearchTerm && (
                    <div className="mb-4 text-sm text-gray-600">
                      Nalezeno <span className="font-semibold text-amber-600">{filteredFavorites.length}</span> pohádek
                      {filteredFavorites.length !== favoriteStories.length && (
                        <span> z {favoriteStories.length}</span>
                      )}
                    </div>
                  )}

                  {favoriteStories.length > 0 ? (
                    filteredFavorites.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredFavorites.map((story) => (
                          <Link
                            key={story.id}
                            href={`/story/${story.id}`}
                            className="group relative bg-gradient-to-br from-white to-amber-50/50 rounded-xl border border-amber-100 hover:border-amber-300 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                          >
                            {/* Decorative corner */}
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full opacity-50"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="text-lg font-serif font-semibold text-gray-800 group-hover:text-amber-700 transition pr-8 line-clamp-2">
                                {story.title}
                              </h3>
                              <button
                                onClick={(e) => handleRemoveFromFavorites(story.id, e)}
                                className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                title="Odebrat z oblíbených"
                              >
                                💔
                              </button>
                            </div>
                            
                            {(story.description || story.excerpt) && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {story.description || story.excerpt}
                              </p>
                            )}
                            
                            {story.tags && story.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {story.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-200">
                                    {tag}
                                  </span>
                                ))}
                                {story.tags.length > 3 && (
                                  <span className="px-2 py-0.5 text-amber-600 text-xs">
                                    +{story.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-3 border-t border-amber-100">
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <span>✍️</span> {story.author}
                              </span>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                {story.likes_count !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <span>❤️</span> {story.likes_count}
                                  </span>
                                )}
                                <span className="text-amber-500 group-hover:translate-x-1 transition-transform">→</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔮</div>
                        <h3 className="text-xl font-serif text-gray-800 mb-2">Žádné výsledky</h3>
                        <p className="text-gray-500 mb-4">Pro hledaný výraz "{favoriteSearchTerm}" nebyly nalezeny žádné oblíbené pohádky.</p>
                        <button
                          onClick={() => setFavoriteSearchTerm("")}
                          className="px-4 py-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                        >
                          Zobrazit všechny oblíbené
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">💝</div>
                      <h3 className="text-xl font-serif text-gray-800 mb-2">Zatím nemáte žádné oblíbené pohádky</h3>
                      <p className="text-gray-500 mb-6">Prozkoumejte naši knihovnu a přidejte si pohádky do oblíbených!</p>
                      <Link
                        href="/browse"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full font-medium hover:from-amber-400 hover:to-yellow-500 transition shadow-lg"
                      >
                        <span>📚</span> Prozkoumat pohádky
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Hero
        title="User Access"
        subtitle="Přihlaste se pro zobrazení profilu."
        height="sm"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-black mb-6">User Access</h1>
          <p className="text-gray-600 mb-6">
            You need a valid hash to access your profile. If you don't have one, please contact the administrator.
          </p>
          <div className="text-center">
            <button
              onClick={() => router.push("/login")}
              className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-lg"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}