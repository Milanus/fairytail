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
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center">
        <p className="text-xl text-purple-600">Loading stories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800">Browse Fairy Tales</h1>
        
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                id="search"
                placeholder="Search stories, authors..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Tag Filter */}
            <div>
              <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Tag</label>
              <select
                id="tag-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                id="sort"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
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
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {story.likes_count || 0} likes
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{story.excerpt}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-500">by {story.author}</span>
                    <span className="text-sm text-gray-500">{story.views_count} views</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {story.tags && story.tags.map((tag, index) => (
                      <span key={index} className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{story.created_at ? new Date(typeof story.created_at === 'number' ? story.created_at : Date.parse(String(story.created_at))).toLocaleDateString() : ''}</span>
                    <div className="flex items-center space-x-2">
                      <Link href={`/story/${story.id}`} className="text-purple-600 hover:text-purple-800 font-medium">
                        Read More
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
            <p className="text-gray-600 text-lg">No stories found matching your criteria. Try adjusting your search or filter.</p>
          </div>
        )}
        
        {/* Pagination */}
        <div className="flex justify-center mt-8">
          <nav className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              1
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition">
              2
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition">
              Next →
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}