"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCurrentUserWithAdmin, logout } from "../lib/auth";

export default function Header() {
  const [user, setUser] = useState<{ name: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUserWithAdmin();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Re-fetch user data when component mounts or when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      fetchUser();
    };

    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUserWithAdmin();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("userIsAdmin");
    setUser(null);
    setLoading(false);
    // Force a re-render by triggering storage event
    window.dispatchEvent(new Event('storage'));
    // Redirect to home page to show logout confirmation
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition">
          <div className="w-10 h-10 bg-purple-600 rounded-full"></div>
          <h1 className="text-2xl font-bold text-purple-800">FairyTale</h1>
        </Link>
        <nav>
          <ul className="flex space-x-6">
            <li><Link href="/" className="text-purple-600 hover:text-purple-800 font-medium">Home</Link></li>
            <li><Link href="/browse" className="text-gray-600 hover:text-purple-800">Browse</Link></li>
            <li><Link href="/submit" className="text-gray-600 hover:text-purple-800">Submit Story</Link></li>
          </ul>
        </nav>
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.name}!</span>
              {user.isAdmin ? (
                <Link
                  href="/admin"
                  className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition"
                >
                  Admin Panel
                </Link>
              ) : (
                <Link
                  href="/user"
                  className="bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition"
                >
                  Profile
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-purple-800"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-purple-800">Login</Link>
              <Link href="/login?mode=signup" className="bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}