"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, update, get, set } from "firebase/database";
import { database } from "../../../lib/firebase";
import { getCurrentUser } from "../../../lib/auth";
import Link from "next/link";

export default function EditClient({ 
  id 
}: { 
  id: string 
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();
  const storyId = id;

  useEffect(() => {
    const loadStory = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const storyRef = ref(database, `fairy_tales/${storyId}`);
        const snapshot = await get(storyRef);

        if (snapshot.exists()) {
          const storyData = snapshot.val();

          // Check if user owns this story or is admin
          if (storyData.author !== user.displayName && !user.isAdmin) {
            setError("You can only edit your own stories.");
            setLoading(false);
            return;
          }

          setTitle(storyData.title || "");
          setAuthor(storyData.author || "");
          setContent(storyData.content || "");
          setTags(storyData.tags ? storyData.tags.join(", ") : "");
          setCategory(storyData.category || "");
          setIsOwner(true);
        } else {
          setError("Story not found.");
        }
      } catch (error) {
        setError("Failed to load story.");
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      loadStory();
    }
  }, [storyId, router]);

  const categoriesList = [
    "Zvířecí pohádky – o liškách, pejscích, koťátkách, lese, farmě",
    "Kráľovství a princezny – klasické pohádky o princeznách, kráľoch a zámkoch",
    "Draci a kouzla – čarovné bytosti, kouzla, čarodějové, dobrodružství",
    "Dobrodružné příběhy – cestovanie, hrdinovia, napätie, nové svety",
    "Příběhy z přírody – les, voda, hory, ročné obdobia, zvieratká v lese",
    "Pohádky o přátelství a lásce – o kamarádstve, pomoci, dobrote",
    "Veselé pohádky – krátke, vtipné, absurdné alebo hravé",
    "Pohádky na dobrou noc – krátke, pokojné, vhodné na čítanie pred spaním",
    "Dinosauří pohádky – o dinosaurech, pravěku, dobrodružstvích v minulosti",
    "Chytré zvířecí pohádky – o moudrých zvířatech, vlcích, liškách, sovách"
  ];

  useEffect(() => {
    setCategories(categoriesList);
  }, []);

  const saveTagsToFirebase = async (tagList: string[]) => {
    for (const tagName of tagList) {
      if (tagName.trim()) {
        const normalizedTag = tagName.toLowerCase().trim();
        const tagRef = ref(database, `tags/${normalizedTag}`);
        try {
          // Always save/update the tag (create or update existing)
          await set(tagRef, {
            name: normalizedTag,
            createdAt: Date.now(),
            lastUsed: Date.now()
          });
        } catch (error) {
        }
      }
    }
  };

  // Input validation and sanitization
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: URLs
      .replace(/on\w+="[^"]*"/gi, "") // Remove event handlers
      .trim();
  };

  const validateInput = (input: string, fieldName: string, maxLength: number = 10000): string | null => {
    if (!input || input.trim().length === 0) {
      return `${fieldName} is required`;
    }
    if (input.length > maxLength) {
      return `${fieldName} is too long (max ${maxLength} characters)`;
    }
    // Check for suspicious patterns
    const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /eval\(/i, /alert\(/i, /document\./i, /window\./i];
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        return `${fieldName} contains invalid content`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      // Sanitize inputs
      const sanitizedTitle = sanitizeInput(title);
      const sanitizedContent = sanitizeInput(content);
      const sanitizedTags = sanitizeInput(tags);

      // Validate inputs
      const titleError = validateInput(sanitizedTitle, "Title", 200);
      if (titleError) {
        setStatus("error");
        setError(titleError);
        return;
      }

      const contentError = validateInput(sanitizedContent, "Story content", 50000);
      if (contentError) {
        setStatus("error");
        setError(contentError);
        return;
      }

      if (!category) {
        setStatus("error");
        setError("Kategorie je povinná");
        return;
      }

      const tagList = sanitizedTags.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);

      // Update the story in Firebase
      const storyRef = ref(database, `fairy_tales/${storyId}`);
      await update(storyRef, {
        title: sanitizedTitle,
        author,
        content: sanitizedContent,
        tags: tagList,
        category,
        status: "pending", // Reset to pending for re-approval
        updated_at: Date.now()
      });

      // Save tags to Firebase
      if (tagList.length > 0) {
        await saveTagsToFirebase(tagList);
      }

      setStatus("success");
      setError("");

      // Redirect to appropriate page based on user type
      const user = getCurrentUser();
      setTimeout(() => {
        if (user?.isAdmin) {
          router.push("/admin");
        } else {
          router.push("/user");
        }
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📝</div>
          <p className="text-xl text-amber-700 animate-pulse">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Access Denied</h1>
              <p className="text-gray-600 mb-8">{error || "You can only edit your own stories."}</p>
              <Link href="/user" className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-6 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-lg">
                Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Edit Your Story</h1>

            {status === "success" ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                <p className="font-bold">Story updated successfully!</p>
                <p>Your story has been updated and is now pending admin approval.</p>
                <p className="text-sm mt-2">Redirecting to your profile...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800 bg-gray-50"
                    required
                    readOnly
                  />
                  <p className="mt-1 text-sm text-gray-500">Author field cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <div className="relative">
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800 appearance-none bg-white"
                      required
                    >
                      <option value="">Vyberte kategorii...</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={(index + 1).toString()}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Vyberte kategorii, do které váš příběh patří
                  </p>
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Story Content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800"
                    required
                  ></textarea>
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., adventure, magic, romance"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> Editing your story will reset its status to "pending" and it will need to be approved by an administrator again before it becomes visible to other users.
                  </p>
                </div>

                {status === "error" && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>Error: {error}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <Link href="/user" className="text-gray-600 hover:text-purple-800">
                    ← Back to Profile
                  </Link>
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 font-medium px-6 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition disabled:opacity-50 shadow-lg"
                  >
                    {status === "submitting" ? "Updating..." : "Update Story"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}