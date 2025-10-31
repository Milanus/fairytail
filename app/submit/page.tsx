"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, push, serverTimestamp, set, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { database, storage } from "../../lib/firebase";
import { getCurrentUserWithAdmin } from "../../lib/auth";
import Link from "next/link";

export default function SubmitStory() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStoryCount, setUserStoryCount] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUserWithAdmin();
      if (user) {
        setIsLoggedIn(true);
        setAuthor(user.name); // Pre-fill author field with logged-in user's name
        // Get user's current story count
        const count = await getUserStoryCount(user.name);
        setUserStoryCount(count);
      } else {
        setIsLoggedIn(false);
      }
      setLoading(false);
    };
    checkAuth();
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
          console.error(`Error saving tag ${tagName}:`, error);
        }
      }
    }
  };

  const getUserStoryCount = async (authorName: string): Promise<number> => {
    const storiesRef = ref(database, 'fairy_tales');
    const snapshot = await get(storiesRef);
    if (snapshot.exists()) {
      const stories = snapshot.val();
      const userStories = Object.values(stories).filter((story: any) => story.author === authorName);
      return userStories.length;
    }
    return 0;
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const imageRef = storageRef(storage, `fairy_tales/${author}/${Date.now()}-${file.name}`);

      // Create upload task with timeout
      const uploadTask = uploadBytes(imageRef, file);

      // Set up timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Upload timeout")), 30000); // 30 seconds
      });

      // Race between upload and timeout
      const snapshot = await Promise.race([uploadTask, timeoutPromise]);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newImages: File[] = [];
      const newPreviews: string[] = [];

      for (let i = 0; i < files.length && images.length + newImages.length < 3; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          newImages.push(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            newPreviews.push(e.target?.result as string);
            if (newPreviews.length === newImages.length) {
              setImages(prev => [...prev, ...newImages]);
              setImagePreviews(prev => [...prev, ...newPreviews]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Input validation and sanitization
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
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
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /alert\(/i,
      /document\./i,
      /window\./i
    ];
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        return `${fieldName} contains invalid content`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting: prevent submissions more frequent than once per 30 seconds
    const now = Date.now();
    if (now - lastSubmissionTime < 30000) {
      setStatus("error");
      setError("Please wait 30 seconds before submitting another story.");
      return;
    }

    setStatus("submitting");
    setLastSubmissionTime(now);

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

      // Check if user has already submitted 3 stories
      const storyCount = await getUserStoryCount(author);
      if (storyCount >= 3) {
        setStatus("error");
        setError("You have reached the maximum limit of 3 fairy tales. You cannot submit more stories.");
        return;
      }

      const tagList = sanitizedTags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);

      // Upload images if provided
      let imageUrls: string[] = [];
      if (images.length > 0) {
        for (const img of images) {
          const url = await handleImageUpload(img);
          if (!url) {
            setStatus("error");
            setError("Failed to upload one or more images. Please try again.");
            return;
          }
          imageUrls.push(url);
        }
      }

      // Create the story object with sanitized data
      const storyData = {
        title: sanitizedTitle,
        author,
        content: sanitizedContent,
        author_id: author, // Use the actual user name as author_id
        status: "pending", // Stories start as pending for admin approval
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        published_at: null, // Will be set when approved
        tags: tagList,
        likes_count: 0,
        views_count: 0,
        image_urls: imageUrls // Add image URLs to story data
      };

      // Push the story to the database
      const storiesRef = ref(database, 'fairy_tales');
      await push(storiesRef, storyData);

      // Save tags to Firebase
      await saveTagsToFirebase(tagList);

      // Reset form
      setTitle("");
      setAuthor("");
      setContent("");
      setTags("");
      setImages([]);
      setImagePreviews([]);

      setStatus("success");
      setError("");
      // Update story count after successful submission
      setUserStoryCount(prev => prev + 1);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center">
        <p className="text-xl text-purple-600">Načítání...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Vyžadováno přihlášení</h1>
              <p className="text-gray-600 mb-8">
                Pro odeslání příběhu musíte být přihlášeni. Přihlaste se nebo vytvořte účet pro sdílení vaší pohádky.
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/login" className="bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition">
                  Přihlásit
                </Link>
                <Link href="/login?mode=signup" className="bg-transparent border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-full hover:bg-purple-600 hover:text-white transition">
                  Registrovat
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">Náhled příběhu</h1>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-600 hover:text-purple-800 font-medium"
                >
                  ← Zpět na formulář
                </button>
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>

              <div className="flex flex-wrap items-center justify-between mb-6">
                <div className="flex items-center">
                  <span className="text-gray-600">by</span>
                  <span className="ml-2 font-medium text-purple-600">{author}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="bg-purple-100 text-purple-800 text-sm font-semibold px-3 py-1 rounded-full">
                    0 likes
                  </span>
                  <span className="bg-purple-100 text-purple-800 text-sm font-semibold px-3 py-1 rounded-full">
                    0 views
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {tags.split(",").map((tag, index) => (
                  <span key={index} className="bg-purple-50 text-purple-700 text-sm font-medium px-3 py-1 rounded-full">
                    {tag.trim()}
                  </span>
                ))}
              </div>

              {imagePreviews.length > 0 && (
                <div className="mb-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Story image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="prose max-w-none text-gray-800">
                {content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Toto je náhled. Příběh bude zveřejněn po schválení administrátorem.
                </p>
              </div>
            </div>
          </div>
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
              Odešlete svou pohádku
            </h1>
            <div className="flex justify-center items-center space-x-4 mb-6">
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
              <div className="text-amber-200 text-xl animate-pulse">🪶</div>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
            </div>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
              Sdílejte své kouzelné příběhy s naší komunitou. Vytvořte nezapomenutelné pohádky, které budou inspirovat čtenáře z celého světa.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">

            <div className="bg-white border-2 border-gray-800 text-black px-4 py-3 rounded-lg mb-6">
              <p className="text-base font-bold">
                <strong>Poznámka:</strong> Můžete odeslat až 3 pohádky. Dosud jste odeslali {userStoryCount}.
              </p>
            </div>
            
            {status === "success" ? (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
                <p className="font-bold">Příběh byl úspěšně odeslán!</p>
                <p>Vaše pohádka byla odeslána a je nyní v procesu schvalování našimi administrátory.</p>
                <p className="text-sm mt-2">Stav svého příběhu můžete zkontrolovat na stránce vašeho profilu.</p>
                <div className="mt-4 flex gap-4">
                  <Link href="/user" className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-medium shadow-lg">
                    📜 Zobrazit mé příběhy
                  </Link>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-medium shadow-lg"
                  >
                    👁️ Náhled příběhu
                  </button>
                  {userStoryCount < 3 && (
                    <button
                      onClick={() => setStatus("idle")}
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Odeslat další
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Název
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                    Autor
                  </label>
                  <input
                    type="text"
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800 bg-gray-50"
                    required
                    readOnly
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Pole autora je automaticky vyplněno vaším uživatelským jménem
                  </p>
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Obsah příběhu
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800"
                    required
                  ></textarea>
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                    Štítky (oddělené čárkou)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="např., dobrodružství, kouzla, romance"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obrázek k příběhu (volitelné)
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {imagePreviews.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        {images.length < 3 && (
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => document.getElementById('image-input')?.click()}
                              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                            >
                              Přidat další obrázky ({3 - images.length} zbývá)
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-gray-500">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Přetáhněte obrázky sem nebo klikněte pro výběr</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF až 10MB každý (max 3 obrázky)</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => document.getElementById('image-input')?.click()}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                        >
                          Vybrat obrázek
                        </button>
                      </div>
                    )}
                    <input
                      id="image-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                  </div>
                </div>

                {status === "error" && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>Error: {error}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <Link href="/" className="text-gray-600 hover:text-purple-800">
                    ← Zpět na domovskou stránku
                  </Link>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="bg-gray-600 text-white font-medium px-6 py-3 rounded-full hover:bg-gray-700 transition"
                    >
                      Náhled
                    </button>
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 font-medium px-6 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition disabled:opacity-50 shadow-lg"
                    >
                      {status === "submitting" ? "Odesílám..." : "📝 Odeslat příběh"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}