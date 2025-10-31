import Image from "next/image";
import Link from "next/link";
import { fetchStoriesOnce } from "../lib/realtime";

export default async function Home() {
  // Fetch only published stories from Firebase
  const featuredStories = await fetchStoriesOnce("published");

  // Function to create a preview of the content (first 100 characters)
  const createContentPreview = (content: string) => {
    if (!content) return "";
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Discover Magical Stories</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
              Read enchanting fairy tales from authors around the world or share your own magical stories
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/browse" className="bg-white text-purple-600 font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition text-lg">
                Browse Stories
              </Link>
              <Link href="/submit" className="bg-transparent border-2 border-white text-white font-bold px-8 py-3 rounded-full hover:bg-white hover:text-purple-600 transition text-lg">
                Submit Your Tale
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Stories */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Featured Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredStories.slice(0, 3).map((story) => (
                <Link key={story.id} href={`/story/${story.id}`} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{story.title}</h3>
                      <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {story.likes_count || 0} likes
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{createContentPreview(story.content)}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">by {story.author}</span>
                      <div className="flex space-x-2">
                        {story.tags && story.tags.map((tag, index) => (
                          <span key={index} className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/browse" className="inline-block bg-purple-600 text-white font-medium px-6 py-3 rounded-full hover:bg-purple-700 transition">
                View All Stories
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-purple-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Create an Account</h3>
                <p className="text-gray-600">Sign up to join our community of storytellers and readers.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Submit Your Tale</h3>
                <p className="text-gray-600">Share your original fairy tales with our community.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Read & Enjoy</h3>
                <p className="text-gray-600">Discover enchanting stories from writers around the world.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
