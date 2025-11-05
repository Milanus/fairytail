import Image from "next/image";
import Link from "next/link";
import { fetchStoriesOnce } from "../lib/realtime";

export default async function Home() {
  // Fetch only published stories from Firebase
  const allPublishedStories = await fetchStoriesOnce("published");

  // Sort by creation date (newest first)
  const sortedStories = allPublishedStories.sort((a, b) => {
    const dateA = typeof a.created_at === 'number' ? a.created_at : Date.parse(String(a.created_at) || '0');
    const dateB = typeof b.created_at === 'number' ? b.created_at : Date.parse(String(b.created_at) || '0');
    return dateB - dateA; // Newest first
  });

  // Get featured stories first, then fill with other published stories (both sorted by date)
  const featuredStories = [
    ...sortedStories.filter(story => story.is_featured),
    ...sortedStories.filter(story => !story.is_featured)
  ];

  // Function to create a preview of the content (first 100 characters)
  const createContentPreview = (content: string) => {
    if (!content) return "";
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <main>
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Enchanted Forest Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800">
            {/* Enchanted Stars */}
            <div className="absolute inset-0">
              {[...Array(35)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 8}s`,
                    animationDuration: `${6 + Math.random() * 4}s`
                  }}
                >
                  <div
                    className="bg-white rounded-full opacity-60 animate-pulse"
                    style={{
                      width: `${1 + Math.random() * 2}px`,
                      height: `${1 + Math.random() * 2}px`,
                    }}
                  ></div>
                </div>
              ))}
            </div>

            {/* Subtle Magical Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-16 left-16 opacity-30" style={{ animationDelay: '2s', animationDuration: '8s' }}>
                <div className="text-amber-200 text-xl">✨</div>
              </div>
              <div className="absolute top-32 right-24 opacity-25" style={{ animationDelay: '4s', animationDuration: '10s' }}>
                <div className="text-yellow-200 text-2xl">🌟</div>
              </div>
              <div className="absolute bottom-24 left-32 opacity-35" style={{ animationDelay: '6s', animationDuration: '9s' }}>
                <div className="text-amber-300 text-lg">⭐</div>
              </div>
              <div className="absolute bottom-16 right-20 opacity-30" style={{ animationDelay: '1s', animationDuration: '11s' }}>
                <div className="text-yellow-300 text-xl">✨</div>
              </div>
            </div>
          </div>

          <div className="relative container mx-auto px-4 text-center text-white">
            <div className="max-w-4xl mx-auto">
              {/* Enchanted Forest Title */}
              <div className="mb-8">
                <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
                      Jednou dávno...
                    </h1>
                <div className="flex justify-center items-center space-x-4 mb-6">
                  <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
                  <div className="text-amber-200 text-2xl animate-pulse">🌿</div>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
                </div>
              </div>

              <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed">
                Vstupte do světa kouzel, kde ožívají pohádkové příběhy.
                Objevte pohádky od vypravěčů z celého světa, nebo vytvořte své vlastní kouzelné příběhy a sdílejte je se světem.
              </p>

              {/* Enchanted Forest CTA Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12">
                <Link
                  href="/browse"
                  className="group relative bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 font-bold px-10 py-4 rounded-full hover:from-amber-400 hover:to-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>🌳</span>
                    <span>Procházet Kouzelné Příběhy</span>
                  </span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-full transition-opacity duration-300"></div>
                </Link>

                <Link
                  href="/submit"
                  className="group relative bg-transparent border-3 border-amber-200 text-amber-200 font-bold px-10 py-4 rounded-full hover:bg-amber-200 hover:text-green-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>🪶</span>
                    <span>Sdílet Svou Legendu</span>
                  </span>
                </Link>
              </div>

              {/* Enchanted Forest Quote */}
              <div className="max-w-2xl mx-auto">
                <blockquote className="text-lg md:text-xl italic text-emerald-100 mb-4">
                    "V srdci starověkých lesů, kde šeptají staré kouzla, příběhy rostou jako mohutné duby..."
                  </blockquote>
                  <cite className="text-sm text-amber-200">— Lesní Vypravěči</cite>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Stories */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Doporučené Příběhy</h2>
            <div className="overflow-x-auto pb-4">
              <div className="flex space-x-6 min-w-max">
                {featuredStories.slice(0, 6).map((story) => (
                  <Link key={story.id} href={`/story/${story.id}`} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer flex-shrink-0 w-80 flex flex-col" title={`Přečíst příběh: ${story.title}`}>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-800">{story.title}</h3>
                        <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-200">
                          {story.likes_count || 0} likes
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 flex-1">{createContentPreview(story.content)}</p>
                      <div className="flex justify-between items-center mt-auto">
                        <span className="text-sm text-gray-500">by {story.author}</span>
                        <div className="flex space-x-2">
                          {story.tags && story.tags.slice(0, 2).map((tag, index) => (
                            <span key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 text-xs font-medium px-2 py-1 rounded border border-amber-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div className="text-center mt-12">
              <Link href="/browse" className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 font-medium px-6 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition shadow-lg">
                📚 Zobrazit všechny příběhy
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-gradient-to-b from-amber-50 to-yellow-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Jak to Funguje</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-green-900 text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Vytvořte Účet</h3>
                <p className="text-gray-600">Přihlaste se a připojte se k naší komunitě vypravěčů a čtenářů.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-green-900 text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Sdílejte Svůj Příběh</h3>
                <p className="text-gray-600">Sdílejte své originální pohádky s naší komunitou.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-green-900 text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Čtěte a Užijte si</h3>
                <p className="text-gray-600">Objevte kouzelné příběhy od spisovatelů z celého světa.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
