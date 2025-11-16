"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserWithAdmin } from "../../lib/auth";
import { database, deleteFromStorage } from "../../lib/firebase";
import { ref, get, remove, set } from "firebase/database";
import { fetchStoriesOnce } from "../../lib/realtime";
import Hero from "../../components/Hero";

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
  story_image_url?: string;
  audio_url?: string;
  is_featured?: boolean;
}

export default function AdminPage() {
  const [user, setUser] = useState<{ name: string; isAdmin: boolean } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [pendingStories, setPendingStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const [editingMedia, setEditingMedia] = useState(false);
  const [newStoryImage, setNewStoryImage] = useState<File | null>(null);
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [audioPrompt, setAudioPrompt] = useState("");
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
    setEditingMedia(false);
    setNewStoryImage(null);
    setNewAudioFile(null);
    setImagePrompt("");
    setAudioPrompt("");
  };

  const handleDeleteStory = async (id: string) => {
    if (confirm("Are you sure you want to delete this story?")) {
      try {
        // First, get the story data to access file URLs
        const storyRef = ref(database, `fairy_tales/${id}`);
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
          const deletePromises = filesToDelete.map(url => deleteFromStorage(url).catch(err => console.warn(`Failed to delete file ${url}:`, err)));
          await Promise.allSettled(deletePromises);
        }

        // Delete the story from database
        await remove(storyRef);
        setStories(stories.filter(s => s.id !== id));
        setPendingStories(pendingStories.filter(s => s.id !== id));
      } catch (error) {
        console.error("Error deleting story:", error);
      }
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const storyRef = ref(database, `fairy_tales/${id}`);
      const storySnapshot = await get(storyRef);
      if (storySnapshot.exists()) {
        const storyData = storySnapshot.val();
        await set(storyRef, {
          ...storyData,
          is_featured: !currentFeatured,
          updated_at: Date.now()
        });
      }

      // Update local state
      setStories(stories.map(s => s.id === id ? { ...s, is_featured: !currentFeatured } : s));
    } catch (error) {
      console.error("Error toggling featured status:", error);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || !previewStory) return;

    setGeneratingImage(true);
    try {
      // This is a placeholder for AI image generation
      // In a real implementation, you would call an AI image generation API
      alert("AI Image generation is not implemented yet. This would integrate with services like DALL-E, Midjourney, or Stable Diffusion.");
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!previewStory) return;

    setGeneratingAudio(true);
    try {
      // Use Google Gemini AI for text-to-speech
      const { GoogleGenAI } = await import('@google/genai');

      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || ''
      });
      console.log("Generating audio with prompt:", previewStory.title, previewStory.content);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Přečti to pomalu a klidně, jako pohádku na dobrou noc.“: ${previewStory.title}. ${previewStory.content}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!data) {
        throw new Error('No audio data received from AI');
      }

      const audioBuffer = Buffer.from(data, 'base64');

      // Convert to blob and upload to Firebase Storage
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'generated-audio.wav', { type: 'audio/wav' });

      // Upload to Firebase Storage
      const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../../lib/firebase');

      const audioStorageRef = storageRef(storage, `fairy_tales/${previewStory.author}/${Date.now()}-ai-audio.wav`);
      const snapshot = await uploadBytes(audioStorageRef, audioFile);
      const audioUrl = await getDownloadURL(snapshot.ref);

      // Update the preview story with the new audio URL
      setPreviewStory({
        ...previewStory,
        audio_url: audioUrl
      });

      // Update the story in database with the new audio URL
      const storyRef = ref(database, `fairy_tales/${previewStory.id}`);
      await set(storyRef, {
        ...previewStory,
        audio_url: audioUrl,
        updated_at: Date.now()
      });

      alert("AI Audio generated and uploaded successfully!");
    } catch (error) {
      console.error("Error generating audio:", error);
      alert("Failed to generate audio. Please check your API key and try again.");
    } finally {
      setGeneratingAudio(false);
    }
  };

  const handleSaveMediaChanges = async () => {
    if (!previewStory) return;

    try {
      let storyImageUrl = previewStory.story_image_url;
      let audioUrl = previewStory.audio_url;

      // Upload new story image if provided
      if (newStoryImage) {
        const imageRef = ref(database, `fairy_tales/${previewStory.author}/${Date.now()}-story-image`);
        const uploadTask = await import('firebase/storage').then(({ uploadBytes, getDownloadURL, ref: storageRef }) => {
          const storage = require('../../lib/firebase').storage;
          const imageStorageRef = storageRef(storage, `fairy_tales/${previewStory.author}/${Date.now()}-story-image`);
          return uploadBytes(imageStorageRef, newStoryImage).then(snapshot => getDownloadURL(snapshot.ref));
        });
        storyImageUrl = uploadTask;
      }

      // Upload new audio file if provided
      if (newAudioFile) {
        const audioRef = ref(database, `fairy_tales/${previewStory.author}/${Date.now()}-audio`);
        const uploadTask = await import('firebase/storage').then(({ uploadBytes, getDownloadURL, ref: storageRef }) => {
          const storage = require('../../lib/firebase').storage;
          const audioStorageRef = storageRef(storage, `fairy_tales/${previewStory.author}/${Date.now()}-audio`);
          return uploadBytes(audioStorageRef, newAudioFile).then(snapshot => getDownloadURL(snapshot.ref));
        });
        audioUrl = uploadTask;
      }

      // Update story in database
      const storyRef = ref(database, `fairy_tales/${previewStory.id}`);
      const updateData: any = {
        ...previewStory,
        updated_at: Date.now()
      };

      if (storyImageUrl !== undefined) {
        updateData.story_image_url = storyImageUrl;
      }
      if (audioUrl !== undefined) {
        updateData.audio_url = audioUrl;
      }

      await set(storyRef, updateData);

      // Update local state
      const updatedPreviewStory = { ...previewStory };
      if (storyImageUrl !== undefined) {
        updatedPreviewStory.story_image_url = storyImageUrl;
      }
      if (audioUrl !== undefined) {
        updatedPreviewStory.audio_url = audioUrl;
      }
      setPreviewStory(updatedPreviewStory);

      setEditingMedia(false);
      setNewStoryImage(null);
      setNewAudioFile(null);
      setImagePrompt("");
      setAudioPrompt("");

      alert("Media files updated successfully!");
    } catch (error) {
      console.error("Error updating media:", error);
      alert("Failed to update media files. Please try again.");
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
                <div className="flex gap-4">
                  {!editingMedia ? (
                    <button
                      onClick={() => setEditingMedia(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Edit Media
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveMediaChanges}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditingMedia(false);
                          setNewStoryImage(null);
                          setNewAudioFile(null);
                          setImagePrompt("");
                          setAudioPrompt("");
                        }}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setPreviewStory(null)}
                    className="text-gray-600 hover:text-purple-800 font-medium"
                  >
                    ← Back to Admin Panel
                  </button>
                </div>
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

              {/* Story Image Preview */}
              {(previewStory.story_image_url || editingMedia) && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Story Header Image</h3>
                  {previewStory.story_image_url && !editingMedia && (
                    <img
                      src={previewStory.story_image_url}
                      alt="Story header image"
                      className="w-full h-64 object-cover rounded-lg border-2 border-amber-300"
                    />
                  )}
                  {editingMedia && (
                    <div className="space-y-4">
                      {previewStory.story_image_url && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Current Image:</p>
                          <img
                            src={previewStory.story_image_url}
                            alt="Current story header image"
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                          />
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {previewStory.story_image_url ? 'Replace Image:' : 'Add Image:'}
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewStoryImage(e.target.files?.[0] || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <button
                            onClick={() => handleGenerateImage()}
                            disabled={generatingImage}
                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingImage ? 'Generating...' : '🎨 Generate AI Image'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audio Preview */}
              {(previewStory.audio_url || editingMedia) && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Audio File</h3>
                  {previewStory.audio_url && !editingMedia && (
                    <audio controls className="w-full">
                      <source src={previewStory.audio_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                  {editingMedia && (
                    <div className="space-y-4">
                      {previewStory.audio_url && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Current Audio:</p>
                          <audio controls className="w-full">
                            <source src={previewStory.audio_url} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {previewStory.audio_url ? 'Replace Audio:' : 'Add Audio:'}
                          </label>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => setNewAudioFile(e.target.files?.[0] || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <button
                            onClick={() => handleGenerateAudio()}
                            disabled={generatingAudio}
                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingAudio ? 'Generating...' : '🎵 Generate AI Audio'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {previewStory.image_urls && previewStory.image_urls.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Images</h3>
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
    <>
      <Hero
        title="Admin Panel"
        subtitle="Správa uživatelů a příběhů"
        height="sm"
      />
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
                  <th className="py-2 px-4 border-b text-black">Featured</th>
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
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => handleToggleFeatured(s.id, s.is_featured || false)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          s.is_featured
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}
                      >
                        {s.is_featured ? '⭐ Featured' : '☆ Not Featured'}
                      </button>
                    </td>
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
    </>
  );
}