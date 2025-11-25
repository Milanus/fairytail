"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm md:text-base">
              🍪 Tato stránka používá cookies pro zajištění správného fungování a přihlášení. 
              Používáme pouze nezbytné technické cookies.{" "}
              <Link href="/gdpr" className="underline hover:text-purple-300 transition-colors">
                Více informací
              </Link>
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={declineCookies}
              className="px-4 py-2 text-sm border border-gray-500 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Odmítnout
            </button>
            <button
              onClick={acceptCookies}
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
            >
              Přijmout cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}