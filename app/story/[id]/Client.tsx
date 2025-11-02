"use client";

import { useState, useEffect } from "react";
import { fetchStoryById, Story } from "../../../lib/realtime";
import { getCurrentUserWithAdmin } from "../../../lib/auth";
import { database } from "../../../lib/firebase";
import { ref, set, remove, get } from "firebase/database";
import Link from "next/link";

export default function StoryPageClient({ id }: { id: string }) {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch story data
        const storyData = await fetchStoryById(id);
        if (storyData) {
          setStory(storyData);
          setLikesCount(storyData.likes_count || 0);
        }

        // Check user authentication
        const user = await getCurrentUserWithAdmin();
        setCurrentUser(user);

        // Check if user has liked this story
        if (user) {
          try {
            const likeRef = ref(database, `user_likes/${user.name}/${id}`);
            const likeSnapshot = await get(likeRef);
            setIsLiked(likeSnapshot.exists());
          } catch (error) {
            console.error("Error checking like status:", error);
          }
        }
      } catch (error) {
        console.error("Error loading story:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const handleLike = async () => {
    if (!currentUser || !story) {
      alert("Please login to like stories.");
      return;
    }

    try {
      const newIsLiked = !isLiked;
      const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;

      if (newIsLiked) {
        // Like the story
        const likeRef = ref(database, `user_likes/${currentUser.name}/${story.id}`);
        await set(likeRef, {
          likedAt: Date.now(),
          storyId: story.id
        });
      } else {
        // Unlike the story
        const likeRef = ref(database, `user_likes/${currentUser.name}/${story.id}`);
        await remove(likeRef);
      }

      // Update story like count
      const storyRef = ref(database, `fairy_tales/${story.id}/likes_count`);
      await set(storyRef, newLikesCount);

      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);
    } catch (error) {
      console.error("Error updating like:", error);
      alert("Failed to update like. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📖</div>
          <p className="text-xl text-amber-700 animate-pulse">Načítání příběhu...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-md">
          <p className="font-bold">Příběh nebyl nalezen</p>
          <p>Požadovaný příběh nebyl nalezen.</p>
          <div className="mt-4">
            <Link href="/browse" className="text-amber-700 hover:text-amber-800 font-medium">
              ← Zpět na procházení
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">

            <h1 className="text-4xl font-bold text-gray-800 mb-4">{story.title}</h1>

            <div className="flex flex-wrap items-center justify-between mb-6">
              <div className="flex items-center">
                <span className="text-gray-600">od</span>
                <span className="ml-2 font-medium text-amber-700">{story.author}</span>
              </div>
              <div className="flex items-center space-x-4">
                {currentUser && (
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                      isLiked
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={isLiked ? "Unlike this story" : "Like this story"}
                  >
                    <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{isLiked ? "Líbí se" : "Líbí se"}</span>
                  </button>
                )}
                <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
                  {likesCount} likes
                </span>
                <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
                  {story.views_count} zobrazení
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              {story.tags && story.tags.map((tag, index) => (
                <span key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-sm font-medium px-3 py-1 rounded-full border border-amber-200">
                  {tag}
                </span>
              ))}
            </div>

            <div className="prose max-w-none text-gray-800">
              {story.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Zveřejněno: {story.published_at ? new Date(story.published_at).toLocaleDateString() : 'Neznámé'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}