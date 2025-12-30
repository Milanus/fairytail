"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCurrentUser, onAuthStateChange, signOutUser } from "../lib/auth";

export default function Header() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName: string; isAdmin: boolean; emailVerified: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from our auth utility
        const currentUser = getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Also listen for storage changes for backward compatibility
  useEffect(() => {
    const handleStorageChange = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setLoading(false);
      setIsMobileMenuOpen(false); // Close mobile menu on logout
      // Redirect to home page to show logout confirmation
      window.location.href = '/';
    } catch (error) {
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-700 shadow-xl border-b-4 border-amber-500 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-800/10 via-green-700/10 to-teal-800/10"></div>
      <div className="relative z-10 container mx-auto px-4 py-4">
        
        {/* Desktop and Mobile Top Bar */}
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 md:space-x-3 hover:scale-105 transition transform" onClick={closeMobileMenu}>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xl md:text-2xl">🏰</span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-amber-200 font-serif tracking-wider drop-shadow-lg">Pohádka</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex">
            <ul className="flex space-x-8">
              <li><Link href="/" className="text-amber-200 hover:text-yellow-300 font-medium font-serif transition text-lg">Domů</Link></li>
              <li><Link href="/browse" className="text-emerald-100 hover:text-amber-200 font-serif transition text-lg">Procházet Příběhy</Link></li>
              <li><Link href="/submit" className="text-emerald-100 hover:text-amber-200 font-serif transition text-lg">Sdílet Příběh</Link></li>
              <li><Link href="/playlist" className="text-emerald-100 hover:text-amber-200 font-serif transition text-lg">Playlist</Link></li>
            </ul>
          </nav>

          {/* Desktop User Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {loading ? (
              <div className="text-amber-200 font-serif animate-pulse">⏳ Načítání...</div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <span className="text-emerald-200 font-serif">Vítejte, {user.displayName}!</span>
                {user.isAdmin ? (
                  <Link
                    href="/admin"
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full hover:from-red-500 hover:to-red-600 transition font-serif shadow-lg"
                  >
                    👑 Správce
                  </Link>
                ) : (
                  <Link
                    href="/user"
                    className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-serif shadow-lg"
                  >
                    📜 Mé Příběhy
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-emerald-200 hover:text-amber-300 font-serif transition"
                >
                  Odhlásit
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-emerald-200 hover:text-amber-300 font-serif transition">Přihlásit</Link>
                <Link href="/login?mode=signup" className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-serif shadow-lg">✨ Připojit se</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-amber-200 hover:text-yellow-300 transition"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-emerald-600/30">
            <nav className="mt-4">
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/" 
                    className="block text-amber-200 hover:text-yellow-300 font-medium font-serif transition text-lg py-2"
                    onClick={closeMobileMenu}
                  >
                    🏠 Domů
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/browse" 
                    className="block text-emerald-100 hover:text-amber-200 font-serif transition text-lg py-2"
                    onClick={closeMobileMenu}
                  >
                    📚 Procházet Příběhy
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/submit" 
                    className="block text-emerald-100 hover:text-amber-200 font-serif transition text-lg py-2"
                    onClick={closeMobileMenu}
                  >
                    ✍️ Sdílet Příběh
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/playlist" 
                    className="block text-emerald-100 hover:text-amber-200 font-serif transition text-lg py-2"
                    onClick={closeMobileMenu}
                  >
                    🎵 Playlist
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Mobile User Actions */}
            <div className="mt-6 pt-4 border-t border-emerald-600/30">
              {loading ? (
                <div className="text-amber-200 font-serif animate-pulse">⏳ Načítání...</div>
              ) : user ? (
                <div className="space-y-3">
                  <div className="text-emerald-200 font-serif text-sm">
                    Vítejte, {user.displayName}!
                  </div>
                  {user.isAdmin ? (
                    <Link
                      href="/admin"
                      className="block w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-full hover:from-red-500 hover:to-red-600 transition font-serif shadow-lg text-center"
                      onClick={closeMobileMenu}
                    >
                      👑 Správce
                    </Link>
                  ) : (
                    <Link
                      href="/user"
                      className="block w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-serif shadow-lg text-center"
                      onClick={closeMobileMenu}
                    >
                      📜 Mé Příběhy
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left text-emerald-200 hover:text-amber-300 font-serif transition py-2"
                  >
                    🚪 Odhlásit
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link 
                    href="/login" 
                    className="block text-emerald-200 hover:text-amber-300 font-serif transition py-2"
                    onClick={closeMobileMenu}
                  >
                    🔑 Přihlásit
                  </Link>
                  <Link 
                    href="/login?mode=signup" 
                    className="block w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-3 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-serif shadow-lg text-center"
                    onClick={closeMobileMenu}
                  >
                    ✨ Připojit se k Dobrodružství
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}