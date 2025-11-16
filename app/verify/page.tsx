"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChange, resendVerificationEmail } from "../../lib/auth";
import Hero from "../../components/Hero";

export default function VerificationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();

  // Check if user is already verified
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user && user.emailVerified) {
        // User is already verified, redirect to login or user page
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleResendEmail = async () => {
    if (!email) {
      setMessage("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await resendVerificationEmail();
      setMessage("Verification email sent! Please check your inbox.");
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Failed to resend verification email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Hero
        title="Account Verification"
        subtitle="Please check your email to verify your account."
        height="sm"
      />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Main Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Account Created Successfully!
            </h1>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Účet byl vytvořen!
            </h2>

            {/* English Description */}
            <p className="text-gray-600 mb-4">
              Your account has been created. Please check your email and click the verification link to complete registration.
            </p>

            {/* Czech Description */}
            <p className="text-gray-600 mb-6">
              Skontrolujte si mail a kliknite na ověřovací odkaz pro dokončení registrace.
            </p>

            {/* Email Resend Section */}
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-gray-500 mb-4">
                Didn't receive the email? Check your spam folder or resend below.
              </p>
              
              <p className="text-sm text-gray-500 mb-4">
                Nedostali jste email? Zkontrolujte spam nebo zašlete znovu níže.
              </p>

              {!showEmailInput ? (
                <button
                  onClick={() => setShowEmailInput(true)}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 py-2 px-6 rounded-full hover:from-amber-400 hover:to-yellow-500 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shadow-lg"
                >
                  Resend Verification Email
                </button>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleResendEmail}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 py-2 px-6 rounded-full hover:from-amber-400 hover:to-yellow-500 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Sending..." : "Send Email"}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowEmailInput(false);
                        setEmail("");
                        setMessage("");
                      }}
                      className="bg-gray-500 text-white py-2 px-6 rounded-full hover:bg-gray-600 transition focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {message && (
                <div className={`mt-4 p-3 rounded-md ${
                  message.includes("sent") 
                    ? "bg-green-100 text-green-700" 
                    : "bg-red-100 text-red-700"
                }`}>
                  {message}
                </div>
              )}
            </div>

            {/* Back to Login */}
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-gray-500 mb-3">
                Already verified your email?
              </p>
              <button
                onClick={() => router.push("/login")}
                className="text-amber-700 hover:text-amber-800 underline font-medium"
              >
                Go to Login
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Instructions:
              </h3>
              <ol className="text-sm text-blue-800 text-left space-y-1">
                <li>1. Check your email inbox</li>
                <li>2. Look for an email from FairyTale</li>
                <li>3. Click the verification link in the email</li>
                <li>4. Return to this page and go to login</li>
              </ol>
              
              <h3 className="font-semibold text-blue-900 mb-2 mt-4">
                Pokyny:
              </h3>
              <ol className="text-sm text-blue-800 text-left space-y-1">
                <li>1. Zkontrolujte svou emailovou schránku</li>
                <li>2. Hledejte email od FairyTale</li>
                <li>3. Klikněte na ověřovací odkaz v emailu</li>
                <li>4. Vraťte se na tuto stránku a přejděte na přihlášení</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}