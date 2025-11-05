"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserWithAdmin } from "../../lib/auth";
import { database } from "../../lib/firebase";
import { ref, get, remove } from "firebase/database";
import { fetchStoriesOnce } from "../../lib/realtime";

interface Story {
  id: string;
  title: string;
  author: string;
  content: string;
  status: string;
  created_at: number;
  tags: string[];
}

export default function UserPage() {
  const [userName, setUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userExists, setUserExists] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUserWithAdmin();

      if (currentUser) {
        setUserName(currentUser.name);
        setIsAdmin(currentUser.isAdmin);
        setUserExists(true);

        // Fetch user's stories
        try {
          const allStories = await fetchStoriesOnce();
          const userStories = allStories.filter(story => story.author === currentUser.name);
          setUserStories(userStories);
        } catch (error) {
          console.error("Error fetching user stories:", error);
        }
      }

      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleDeleteStory = async (storyId: string) => {
    if (confirm("Are you sure you want to delete this story?")) {
      try {
        const storyRef = ref(database, `fairy_tales/${storyId}`);
        await remove(storyRef);
        setUserStories(userStories.filter(s => s.id !== storyId));
      } catch (error) {
        console.error("Error deleting story:", error);
        alert("Failed to delete story. Please try again.");
      }
    }
  };

  const handlePreviewStory = (story: Story) => {
    setPreviewStory(story);
  };

  const handleLogout = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userIsAdmin");
    setUserName("");
    setIsAdmin(false);
    setUserExists(false);
    setUserStories([]);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-3xl font-bold text-black mb-6">Loading...</h1>
          <p className="text-gray-600">Verifying your account</p>
        </div>
      </div>
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-black mb-6">User Profile</h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Welcome, {userName}!</h2>
            {isAdmin && <p className="text-red-600 font-medium mb-2">Admin User</p>}
            <p className="text-gray-600">Your username:</p>
            <div className="mt-2 p-3 bg-gray-100 rounded-md font-mono text-sm break-all">
              {userName}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Stories ({userStories.length})</h2>
            {userStories.length > 0 ? (
              <div className="space-y-4">
                {userStories.map((story) => (
                  <div key={story.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{story.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          story.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : story.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {story.status}
                        </span>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title="Delete story"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-2 line-clamp-2">{story.content.substring(0, 150)}...</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {story.tags && story.tags.map((tag, index) => (
                          <span key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-xs px-2 py-1 rounded border border-amber-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span>{new Date(story.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={() => handlePreviewStory(story)}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="Preview story"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => router.push(`/edit/${story.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Edit story"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Delete story"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't submitted any stories yet.</p>
                <button
                  onClick={() => router.push("/submit")}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-lg"
                >
                  Submit Your First Story
                </button>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
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
  );
}