"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserWithAdmin } from "../../lib/auth";
import { database } from "../../lib/firebase";
import { ref, get, remove, set } from "firebase/database";
import { fetchStoriesOnce } from "../../lib/realtime";

interface User {
  name: string;
  createdAt: number;
  isAdmin: boolean;
}

interface Story {
  id: string;
  title: string;
  author: string;
  content: string;
  status: string;
  created_at: number;
  tags?: string[];
  image_urls?: string[];
}

export default function AdminPage() {
  const [user, setUser] = useState<{ name: string; isAdmin: boolean } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [pendingStories, setPendingStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUserWithAdmin();
      if (!currentUser || !currentUser.isAdmin) {
        router.push("/");
        return;
      }
      setUser(currentUser);

      // Fetch users
      try {
        const usersRef = ref(database, "users");
        const usersSnapshot = await get(usersRef);
        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          const usersList: User[] = Object.keys(usersData).map(name => ({
            name,
            ...usersData[name]
          }));
          setUsers(usersList);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }

      // Fetch all stories and pending stories
      try {
        const allStories = await fetchStoriesOnce();
        const pendingStoriesList = await fetchStoriesOnce("pending");
        setStories(allStories);
        setPendingStories(pendingStoriesList);
      } catch (error) {
        console.error("Error fetching stories:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleDeleteUser = async (name: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const userRef = ref(database, `users/${name}`);
        await remove(userRef);
        setUsers(users.filter(u => u.name !== name));
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleApproveStory = async (id: string) => {
    try {
      const storyRef = ref(database, `fairy_tales/${id}`);
      const storySnapshot = await get(storyRef);
      if (storySnapshot.exists()) {
        const storyData = storySnapshot.val();
        await set(storyRef, {
          ...storyData,
          status: "published",
          published_at: Date.now(),
          updated_at: Date.now()
        });
      }

      // Update local state
      setPendingStories(pendingStories.filter(s => s.id !== id));
      // Refresh all stories
      const allStories = await fetchStoriesOnce();
      setStories(allStories);
    } catch (error) {
      console.error("Error approving story:", error);
    }
  };

  const handleRejectStory = async (id: string) => {
    if (confirm("Are you sure you want to reject and delete this story?")) {
      try {
        const storyRef = ref(database, `fairy_tales/${id}`);
        await remove(storyRef);
        setPendingStories(pendingStories.filter(s => s.id !== id));
        setStories(stories.filter(s => s.id !== id));
      } catch (error) {
        console.error("Error rejecting story:", error);
      }
    }
  };

  const handlePreviewStory = (story: Story) => {
    setPreviewStory(story);
  };

  const handleDeleteStory = async (id: string) => {
    if (confirm("Are you sure you want to delete this story?")) {
      try {
        const storyRef = ref(database, `fairy_tales/${id}`);
        await remove(storyRef);
        setStories(stories.filter(s => s.id !== id));
        setPendingStories(pendingStories.filter(s => s.id !== id));
      } catch (error) {
        console.error("Error deleting story:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-3xl font-bold text-black mb-6">Loading...</h1>
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
                  ← Back to Admin Panel
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

              {previewStory.image_urls && previewStory.image_urls.length > 0 && (
                <div className="mb-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {previewStory.image_urls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Story image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-3xl font-bold text-black mb-6">Access Denied</h1>
          <p className="text-gray-600 mb-6">You must be an admin to access this page.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-black mb-6">Admin Panel</h1>
        <p className="text-gray-600 mb-8">Welcome, {user.name}! Manage users and stories.</p>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-black mb-4">Pending Stories ({pendingStories.length})</h2>
          {pendingStories.length > 0 ? (
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-4 border-b text-left text-black">Title</th>
                    <th className="py-2 px-4 border-b text-left text-black">Author</th>
                    <th className="py-2 px-4 border-b text-left text-black">Submitted</th>
                    <th className="py-2 px-4 border-b text-left text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStories.map(s => (
                    <tr key={s.id} className="text-black">
                      <td className="py-2 px-4 border-b">{s.title}</td>
                      <td className="py-2 px-4 border-b">{s.author}</td>
                      <td className="py-2 px-4 border-b">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-4 border-b">
                        <button
                          onClick={() => handlePreviewStory(s)}
                          className="bg-blue-600 text-white px-3 py-1 rounded mr-2 hover:bg-blue-700"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleApproveStory(s.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded mr-2 hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectStory(s.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 mb-8">No pending stories to review.</p>
          )}

          <h2 className="text-2xl font-semibold text-black mb-4">Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-black">Username</th>
                  <th className="py-2 px-4 border-b text-black">Admin</th>
                  <th className="py-2 px-4 border-b text-black">Created</th>
                  <th className="py-2 px-4 border-b text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.name} className="text-black">
                    <td className="py-2 px-4 border-b">{u.name}</td>
                    <td className="py-2 px-4 border-b">{u.isAdmin ? "Yes" : "No"}</td>
                    <td className="py-2 px-4 border-b">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => handleDeleteUser(u.name)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-black mb-4">Stories</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-black">Title</th>
                  <th className="py-2 px-4 border-b text-black">Author</th>
                  <th className="py-2 px-4 border-b text-black">Status</th>
                  <th className="py-2 px-4 border-b text-black">Created</th>
                  <th className="py-2 px-4 border-b text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map(s => (
                  <tr key={s.id} className="text-black">
                    <td className="py-2 px-4 border-b">{s.title}</td>
                    <td className="py-2 px-4 border-b">{s.author}</td>
                    <td className="py-2 px-4 border-b">{s.status}</td>
                    <td className="py-2 px-4 border-b">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => handlePreviewStory(s)}
                        className="text-green-600 hover:text-green-800 mr-2"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => router.push(`/edit/${s.id}`)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStory(s.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}