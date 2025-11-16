"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCurrentUser, onAuthStateChange, signOutUser } from "../lib/auth";

export default function Header() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName: string; isAdmin: boolean; emailVerified: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

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
      // Redirect to home page to show logout confirmation
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-700 shadow-xl border-b-4 border-amber-500 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-800/10 via-green-700/10 to-teal-800/10"></div>
      <div className="relative z-10 container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-3 hover:scale-105 transition transform">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl">🏰</span>
          </div>
          <h1 className="text-3xl font-bold text-amber-200 font-cinzel tracking-wider">Pohádka</h1>
        </Link>
        <nav>
          <ul className="flex space-x-8">
            <li><Link href="/" className="text-amber-200 hover:text-yellow-300 font-medium font-quicksand transition text-lg">Domů</Link></li>
            <li><Link href="/browse" className="text-emerald-100 hover:text-amber-200 font-quicksand transition text-lg">Procházet Příběhy</Link></li>
            <li><Link href="/submit" className="text-emerald-100 hover:text-amber-200 font-quicksand transition text-lg">Sdílet Příběh</Link></li>
          </ul>
        </nav>
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="text-amber-200 font-quicksand animate-pulse">⏳ Načítání...</div>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <span className="text-emerald-200 font-quicksand">Vítejte, {user.displayName}!</span>
              {user.isAdmin ? (
                <Link
                  href="/admin"
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full hover:from-red-500 hover:to-red-600 transition font-quicksand shadow-lg"
                >
                  👑 Správce
                </Link>
              ) : (
                <Link
                  href="/user"
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-quicksand shadow-lg"
                >
                  📜 Mé Příběhy
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-emerald-200 hover:text-amber-300 font-quicksand transition"
              >
                Odhlásit
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-emerald-200 hover:text-amber-300 font-quicksand transition">Přihlásit</Link>
              <Link href="/login?mode=signup" className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 px-4 py-2 rounded-full hover:from-amber-400 hover:to-yellow-500 transition font-quicksand shadow-lg">✨ Připojit se k Dobrodružství</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}