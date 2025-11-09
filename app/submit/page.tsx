"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, push, serverTimestamp, set, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { database, storage } from "../../lib/firebase";
import { getCurrentUserWithAdmin } from "../../lib/auth";
import Link from "next/link";
import Hero from "../../components/Hero";

export default function SubmitStory() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
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
   const [storyImage, setStoryImage] = useState<File | null>(null);
   const [storyImagePreview, setStoryImagePreview] = useState<string>("");
   const [isDragOver, setIsDragOver] = useState(false);
   const [showPreview, setShowPreview] = useState(false);
   const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);
   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
   const [audioFile, setAudioFile] = useState<File | null>(null);
   const [category, setCategory] = useState("");
   const [categories, setCategories] = useState<string[]>([]);
   const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUserWithAdmin();
      if (user) {
        setIsLoggedIn(true);
        setAuthor(user.name); // Pre-fill author field with logged-in user's name
        // Get user's current pending story count
        const count = await getUserPendingStoryCount(user.name);
        setUserStoryCount(count);
      } else {
        setIsLoggedIn(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const categoriesList = [
    "Zvířecí pohádky – o liškách, pejscích, koťátkách, lese, farmě",
    "Kráľovství a princezny – klasické pohádky o princeznách, kráľoch a zámkoch",
    "Draci a kouzla – čarovné bytosti, kouzla, čarodějové, dobrodružství",
    "Dobrodružné příběhy – cestovanie, hrdinovia, napätie, nové svety",
    "Příběhy z přírody – les, voda, hory, ročné obdobia, zvieratká v lese",
    "Pohádky o přátelství a lásce – o kamarádstve, pomoci, dobrote",
    "Veselé pohádky – krátke, vtipné, absurdné alebo hravé",
    "Pohádky na dobrou noc – krátke, pokojné, vhodné na čítanie pred spaním"
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
          console.error(`Error saving tag ${tagName}:`, error);
        }
      }
    }
  };

  const saveCategoriesToFirebase = async (categoryList: string[]) => {
    for (const categoryName of categoryList) {
      if (categoryName.trim()) {
        const normalizedCategory = categoryName.toLowerCase().trim();
        const categoryRef = ref(database, `categories/${normalizedCategory}`);
        try {
          // Always save/update the category (create or update existing)
          await set(categoryRef, {
            name: categoryName,
            createdAt: Date.now(),
            lastUsed: Date.now()
          });
        } catch (error) {
          console.error(`Error saving category ${categoryName}:`, error);
        }
      }
    }
  };

  const assignCategoryToUser = async (userName: string, categoryName: string) => {
    try {
      const userRef = ref(database, `users/${userName}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const currentCategories = userData.categories || [];
        if (!currentCategories.includes(categoryName)) {
          currentCategories.push(categoryName);
          await set(userRef, {
            ...userData,
            categories: currentCategories,
            updated_at: serverTimestamp()
          });
        }
      } else {
        // Create user entry if it doesn't exist
        await set(userRef, {
          name: userName,
          categories: [categoryName],
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Error assigning category ${categoryName} to user ${userName}:`, error);
    }
  };

  const getUserPendingStoryCount = async (authorName: string): Promise<number> => {
    const storiesRef = ref(database, 'fairy_tales');
    const snapshot = await get(storiesRef);
    if (snapshot.exists()) {
      const stories = snapshot.val();
      const pendingStories = Object.values(stories).filter((story: any) =>
        story.author === authorName && story.status === 'pending'
      );
      return pendingStories.length;
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

      for (let i = 0; i < files.length && images.length + newImages.length < 2; i++) {
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

  const handleStoryImageSelect = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      // Check if image is landscape (width > height)
      const img = new Image();
      img.onload = () => {
        if (img.width > img.height) {
          setStoryImage(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setStoryImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          alert('Prosím vyberte širokoúhlý obrázek (krajina). Obrázek musí být širší než vyšší.');
        }
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const removeStoryImage = () => {
    setStoryImage(null);
    setStoryImagePreview("");
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
      const sanitizedDescription = sanitizeInput(description);
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

      // Check if user has already submitted a pending story
      const pendingStoryCount = await getUserPendingStoryCount(author);
      if (pendingStoryCount >= 1) {
        setStatus("error");
        setError("Již máte jeden příběh čekající na schválení. Můžete odeslat další příběh až poté, co bude váš současný příběh schválen nebo zamítnut.");
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

      // Upload story image if provided
      let storyImageUrl: string | null = null;
      if (storyImage) {
        storyImageUrl = await handleImageUpload(storyImage);
        if (!storyImageUrl) {
          setStatus("error");
          setError("Failed to upload story image. Please try again.");
          return;
        }
      }

      // Upload audio file if provided
      let audioUrl: string | null = null;
      if (audioFile) {
        try {
          const audioRef = storageRef(storage, `fairy_tales/${author}/${Date.now()}-${audioFile.name}`);
          const audioSnapshot = await uploadBytes(audioRef, audioFile);
          audioUrl = await getDownloadURL(audioSnapshot.ref);
        } catch (error) {
          console.error("Error uploading audio file:", error);
          setStatus("error");
          setError("Failed to upload audio file. Please try again.");
          return;
        }
      }

      // Create the story object with sanitized data
      const storyData = {
        title: sanitizedTitle,
        description: sanitizedDescription,
        author,
        content: sanitizedContent,
        author_id: author, // Use the actual user name as author_id
        status: "pending", // Stories start as pending for admin approval
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        published_at: null, // Will be set when approved
        tags: tagList,
        category,
        likes_count: 0,
        views_count: 0,
        image_urls: imageUrls, // Add image URLs to story data
        story_image_url: storyImageUrl, // Add story image URL to story data
        audio_url: audioUrl // Add audio URL to story data
      };

      // Push the story to the database
      const storiesRef = ref(database, 'fairy_tales');
      await push(storiesRef, storyData);

      // Save tags to Firebase
      await saveTagsToFirebase(tagList);

      // Save categories to Firebase
      await saveCategoriesToFirebase(categories);

      // Assign category to user
      await assignCategoryToUser(author, category);

      // Reset form
      // setTitle("");
      // setDescription("");
      // setAuthor("");
      // setContent("");
      // setTags("");
      // setImages([]);
      // setImagePreviews([]);
      // setStoryImage(null);
      // setStoryImagePreview("");
      // setAudioFile(null);

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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏰</div>
          <p className="text-xl text-amber-700 animate-pulse">Načítání kouzelného světa...</p>
        </div>
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
                <Link href="/login" className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-6 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-lg">
                  Přihlásit
                </Link>
                <Link href="/login?mode=signup" className="bg-transparent border-2 border-amber-700 text-amber-700 px-6 py-3 rounded-full hover:bg-amber-700 hover:text-white transition">
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
                Náhled příběhu
              </h1>
              <div className="flex justify-center items-center space-x-4 mb-6">
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
                <div className="text-amber-200 text-xl animate-pulse">👁️</div>
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
              </div>
              <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
                Zde je náhled vašeho příběhu před odesláním. Zkontrolujte obsah a klikněte na "Zpět na formulář" pro úpravy.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-600 hover:text-purple-800 font-medium"
                >
                  ← Zpět na formulář
                </button>
              </div>

              <div className="mb-4">
                {storyImagePreview && (
                  <img
                    src={storyImagePreview}
                    alt="Story header image"
                    className="w-full h-64 object-cover rounded-lg border-2 border-amber-300 mb-4"
                  />
                )}
                <div className="flex-1">
                  {description && (
                    <p className="text-lg text-gray-600 mb-2 italic">{description}</p>
                  )}
                  <div className="flex items-center">
                    <span className="text-gray-600">od</span>
                    <span className="ml-2 font-medium text-amber-700">{author}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end mb-6">
                <div className="flex items-center space-x-4">
                  <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
                    0 likes
                  </span>
                  <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
                    0 views
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {tags.split(",").map((tag, index) => (
                  <span key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-sm font-medium px-3 py-1 rounded-full border border-amber-200">
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
      <Hero
        title="Odešlete svou pohádku"
        subtitle="Sdílejte své kouzelné příběhy s naší komunitou."
        height="sm"
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">

          <div className="bg-white border-2 border-gray-800 text-black px-4 py-3 rounded-lg mb-6">
            <p className="text-base font-bold">
              <strong>Poznámka:</strong> Můžete mít pouze jeden příběh čekající na schválení. {userStoryCount > 0 ? 'Aktuálně máte jeden příběh ve frontě.' : 'Můžete odeslat nový příběh.'}
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
                  {userStoryCount < 1 && (
                    <button
                      onClick={() => setStatus("idle")}
                      className="text-amber-700 hover:text-amber-800 font-medium"
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Přidejte emoji a název vašeho příběhu..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-lg"
                      title="Přidat emoji"
                    >
                      👸
                    </button>
                  </div>
                  {showEmojiPicker && (
                    <div className="mt-2 p-3 bg-white border border-gray-300 rounded-lg shadow-lg">
                      <div className="grid grid-cols-8 gap-2 text-2xl">
                        {['👑', '👸', '🤴', '🏰', '🏯', '🧚', '🧚‍♂️', '🧙', '🧙‍♂️', '🧟', '🧟‍♂️', '🧞', '🧞‍♂️', '🧜', '🧜‍♂️', '🧝', '🧝‍♂️', '🐉', '🦄', '🐺', '🐗', '🦌', '🐓', '🐔', '🦆', '🦅', '🦉', '🦇', '🐌', '🐛', '🐜', '🐝', '🐞', '🦋', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🐊', '🐸', '🐇', '🐿️', '🦔', '🦇', '🦅', '🦉', '🐦', '🐧', '🦆', '🦢', '🦜', '🦚', '🦃', '🐔', '🐓', '🐣', '🐥', '🐤', '🐦', '🐦‍⬛', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🌿', '🍀', '🎋', '🎍', '🌾', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎋', '🎍', '🌾', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setTitle(title + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="hover:bg-gray-100 rounded p-1 transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Zavřít
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Krátký popis (volitelné) - max 200 znaků
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setDescription(e.target.value);
                      }
                    }}
                    placeholder="Krátký popis vašeho příběhu..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800"
                    maxLength={200}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {description.length}/200 znaků
                  </p>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800 bg-gray-50"
                    required
                    readOnly
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Pole autora je automaticky vyplněno vaším uživatelským jménem
                  </p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obrázek záhlaví příběhu (volitelné)
                  </label>
                  <div className="flex items-center space-x-4">
                    {storyImagePreview ? (
                      <div className="relative">
                        <img
                          src={storyImagePreview}
                          alt="Story preview"
                          className="w-20 h-20 object-cover rounded-lg border-2 border-amber-300"
                        />
                        <button
                          type="button"
                          onClick={removeStoryImage}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => document.getElementById('story-image-input')?.click()}
                        className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-medium shadow-lg text-sm"
                      >
                        {storyImagePreview ? 'Změnit obrázek záhlaví' : '🖼️ Vybrat obrázek záhlaví'}
                      </button>
                      <p className="mt-1 text-xs text-gray-500">
                        PNG, JPG, GIF až 5MB (doporučujeme širokoúhlé obrázky pro lepší zobrazení)
                      </p>
                    </div>
                  </div>
                  <input
                    id="story-image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleStoryImageSelect(e.target.files?.[0] || null)}
                    className="hidden"
                  />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Audio soubor pohádky (volitelné)
                  </label>
                  <div className="flex items-center space-x-4">
                    {audioFile ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">🎵</span>
                        <span className="text-sm text-gray-700">{audioFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setAudioFile(null)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => document.getElementById('audio-input')?.click()}
                          className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-medium shadow-lg text-sm"
                        >
                          🎵 Vybrat audio soubor pohádky
                        </button>
                        <p className="mt-1 text-xs text-gray-500">
                          MP3, WAV, OGG až 50MB - nahrajte zvukovou verzi vaší pohádky
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="audio-input"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.type.startsWith('audio/')) {
                        if (file.size <= 50 * 1024 * 1024) { // 50MB limit
                          setAudioFile(file);
                        } else {
                          alert('Audio soubor je příliš velký. Maximální velikost je 50MB.');
                        }
                      } else {
                        alert('Prosím vyberte platný audio soubor.');
                      }
                    }}
                    className="hidden"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obrázek k příběhu (volitelné)
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver
                        ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50'
                        : 'border-gray-300 hover:border-amber-400'
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
                        {images.length < 2 && (
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => document.getElementById('image-input')?.click()}
                              className="text-amber-700 hover:text-amber-800 text-sm font-medium"
                            >
                              Přidat další obrázky ({2 - images.length} zbývá)
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
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF až 10MB každý (max 2 obrázky)</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => document.getElementById('image-input')?.click()}
                          className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-medium shadow-lg"
                        >
                          🖼️ Vybrat obrázek
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