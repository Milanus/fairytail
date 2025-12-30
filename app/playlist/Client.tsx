"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { subscribeToStories, Story } from "../../lib/realtime";
import { getCurrentUser } from "../../lib/auth";
import { database } from "../../lib/firebase";
import { ref, get } from "firebase/database";

export default function PlaylistClient() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<{ displayName: string } | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  useEffect(() => {
    const checkUser = async () => {
      const user = getCurrentUser();
      setCurrentUser(user);

      if (user) {
        try {
          const favoritesRef = ref(database, `user_likes/${user.displayName}`);
          const snapshot = await get(favoritesRef);
          if (snapshot.exists()) {
            const favData = snapshot.val();
            setUserFavorites(new Set(Object.keys(favData)));
          }
        } catch (error) {
          console.error("Error loading favorites:", error);
        }
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToStories((data) => {
      // Filter stories that have audio files
      const storiesWithAudio = (data || []).filter(story => story.audio_url);
      setStories(storiesWithAudio);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectStory = (storyId: string) => {
    setSelectedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const currentStories = activeTab === "favorites" 
      ? stories.filter(s => userFavorites.has(s.id))
      : stories;
    
    if (selectedStories.size === currentStories.length) {
      setSelectedStories(new Set());
    } else {
      setSelectedStories(new Set(currentStories.map(s => s.id)));
    }
  };

  const handleAutoPlay = () => {
    if (selectedStories.size === 0) return;
    
    const selectedArray = Array.from(selectedStories);
    const firstStory = selectedArray[0];
    setIsAutoPlaying(true);
    setCurrentlyPlaying(firstStory);
    
    const audio = audioRefs.current[firstStory];
    if (audio) {
      audio.play();
    }
  };

  const handleAudioEnded = (storyId: string) => {
    if (!isAutoPlaying) return;
    
    const selectedArray = Array.from(selectedStories);
    const currentIndex = selectedArray.indexOf(storyId);
    
    if (currentIndex < selectedArray.length - 1) {
      const nextStory = selectedArray[currentIndex + 1];
      setCurrentlyPlaying(nextStory);
      const audio = audioRefs.current[nextStory];
      if (audio) {
        audio.play();
      }
    } else {
      setIsAutoPlaying(false);
      setCurrentlyPlaying(null);
    }
  };

  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
    if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
      audioRefs.current[currentlyPlaying]?.pause();
    }
    setCurrentlyPlaying(null);
  };

  const displayedStories = activeTab === "favorites"
    ? stories.filter(s => userFavorites.has(s.id))
    : stories;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
          <p className="mt-4 text-emerald-800 font-serif">Načítání audio pohádek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-12 pb-32">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-emerald-800 font-serif mb-4">
            🎵 Audio Playlist
          </h1>
          <p className="text-xl text-emerald-700 font-serif">
            Pohádky s audio nahrávkami
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-6 py-3 rounded-full font-serif transition-all ${
              activeTab === "all"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border-2 border-emerald-300"
            }`}
          >
            📻 Všechny ({stories.length})
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`px-6 py-3 rounded-full font-serif transition-all ${
              activeTab === "favorites"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border-2 border-emerald-300"
            }`}
          >
            ❤️ Oblíbené ({stories.filter(s => userFavorites.has(s.id)).length})
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-2xl p-4 mb-8 border-2 border-emerald-300 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-300 font-serif"
              >
                <div 
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                    selectedStories.size === displayedStories.length && displayedStories.length > 0
                      ? "border-emerald-600"
                      : "border-emerald-400 bg-white"
                  }`}
                  style={selectedStories.size === displayedStories.length && displayedStories.length > 0 ? { backgroundColor: '#059669' } : undefined}
                >
                  {selectedStories.size === displayedStories.length && displayedStories.length > 0 && (
                    <svg className="w-3 h-3" fill="none" stroke="#ffffff" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                Vybrat vše
              </button>
              <span className="text-emerald-700 text-sm font-serif">
                {selectedStories.size} vybráno
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {isAutoPlaying ? (
                <button
                  onClick={stopAutoPlay}
                  className="flex items-center gap-2 px-6 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg font-serif"
                >
                  ⏹️ Zastavit
                </button>
              ) : (
                <button
                  onClick={handleAutoPlay}
                  disabled={selectedStories.size === 0}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full transition shadow-lg font-serif ${
                    selectedStories.size > 0
                      ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 hover:from-amber-400 hover:to-yellow-500"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  ▶️ Přehrát vybrané
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stories List */}
        {displayedStories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎧</div>
            <p className="text-2xl text-emerald-700 font-serif mb-4">
              {activeTab === "favorites" 
                ? "Nemáte žádné oblíbené audio pohádky"
                : "Zatím nejsou k dispozici žádné audio pohádky"
              }
            </p>
            <p className="text-emerald-600 font-serif">
              {activeTab === "favorites" 
                ? "Přidejte si pohádky do oblíbených!"
                : "Zkuste to prosím později!"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedStories.map((story, index) => (
              <div
                key={story.id}
                className={`group relative bg-white rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-md hover:shadow-xl ${
                  selectedStories.has(story.id)
                    ? "border-emerald-500"
                    : currentlyPlaying === story.id
                    ? "border-amber-400 shadow-amber-200"
                    : "border-emerald-200 hover:border-emerald-300"
                }`}
                style={selectedStories.has(story.id) ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : undefined}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleSelectStory(story.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                      selectedStories.has(story.id)
                        ? "border-emerald-600"
                        : "border-emerald-400 bg-white hover:border-emerald-500"
                    }`}
                    style={selectedStories.has(story.id) ? { backgroundColor: '#059669' } : undefined}
                  >
                    {selectedStories.has(story.id) && (
                      <svg className="w-4 h-4" fill="none" stroke="#ffffff" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Track Number */}
                  <div className="flex-shrink-0 w-8 text-center">
                    {currentlyPlaying === story.id ? (
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="w-1 h-4 bg-amber-500 rounded-full animate-pulse"></span>
                        <span className="w-1 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '75ms' }}></span>
                        <span className="w-1 h-5 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                      </div>
                    ) : (
                      <span className="text-emerald-600/60 font-serif font-semibold">{index + 1}</span>
                    )}
                  </div>

                  {/* Story Image */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-emerald-100 border-2 border-emerald-200">
                    {story.story_image_url ? (
                      <img
                        src={story.story_image_url}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🎵
                      </div>
                    )}
                  </div>

                  {/* Story Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-emerald-800 truncate group-hover:text-emerald-600 transition font-serif">
                      {story.title}
                    </h3>
                    <p className="text-sm text-emerald-600 truncate font-serif">
                      ✍️ {story.author}
                    </p>
                  </div>

                  {/* Favorite indicator */}
                  {userFavorites.has(story.id) && (
                    <span className="text-red-500 text-xl">❤️</span>
                  )}

                  {/* Read More Link */}
                  <Link
                    href={`/story/${story.id}`}
                    className="flex-shrink-0 px-4 py-2 text-sm text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border-2 border-emerald-300 hover:border-emerald-600 rounded-full transition font-serif"
                  >
                    Číst dál →
                  </Link>
                </div>

                {/* Audio Player - Compact */}
                {story.audio_url && (
                  <div className="px-4 pb-4">
                    <audio
                      ref={(el) => { audioRefs.current[story.id] = el; }}
                      controls
                      className="w-full h-10 rounded-lg"
                      onPlay={() => setCurrentlyPlaying(story.id)}
                      onPause={() => !isAutoPlaying && setCurrentlyPlaying(null)}
                      onEnded={() => handleAudioEnded(story.id)}
                    >
                      <source src={story.audio_url} type="audio/mpeg" />
                      Váš prohlížeč nepodporuje audio přehrávač.
                    </audio>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Now Playing Bar */}
        {currentlyPlaying && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-700 via-green-600 to-teal-700 border-t-4 border-amber-500 p-4 z-50 shadow-2xl">
            <div className="container mx-auto flex items-center gap-4">
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-4 bg-amber-300 rounded-full animate-pulse"></span>
                <span className="w-1 h-3 bg-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '75ms' }}></span>
                <span className="w-1 h-5 bg-amber-300 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
              </div>
              <span className="text-amber-200 font-serif font-semibold">
                Právě hraje: {stories.find(s => s.id === currentlyPlaying)?.title}
              </span>
              {isAutoPlaying && (
                <span className="ml-auto text-sm text-amber-300 font-serif">
                  🔁 Autoplay aktivní
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
