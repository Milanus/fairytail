"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmail, signUpWithEmail, onAuthStateChange, resendVerificationEmail } from "../../lib/auth";
import Hero from "../../components/Hero";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsNewUser(mode === 'signup');
  }, [searchParams]);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user && user.emailVerified) {
        // User is verified, redirect to user page
        router.push("/user");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Input validation and sanitization
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
      .trim();
  };

  const validateInput = (input: string, fieldName: string, maxLength: number = 100): string | null => {
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

  const validateEmail = (email: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedDisplayName = sanitizeInput(displayName);
      const sanitizedPassword = sanitizeInput(password);
      const sanitizedConfirmPassword = sanitizeInput(confirmPassword);

      // Validate email
      const emailError = validateEmail(sanitizedEmail);
      if (emailError) {
        setError(emailError);
        return;
      }

      // Validate password
      const passwordError = validateInput(sanitizedPassword, "Password", 100);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (isNewUser) {
        // Validate display name for new users
        const displayNameError = validateInput(sanitizedDisplayName, "Display name", 50);
        if (displayNameError) {
          setError(displayNameError);
          return;
        }

        // Validate confirm password
        const confirmPasswordError = validateInput(sanitizedConfirmPassword, "Confirm password", 100);
        if (confirmPasswordError) {
          setError(confirmPasswordError);
          return;
        }

        if (sanitizedPassword !== sanitizedConfirmPassword) {
          setError("Passwords do not match");
          return;
        }

        // Sign up new user
        await signUpWithEmail(sanitizedEmail, sanitizedPassword, sanitizedDisplayName);
        // Redirect to verification page
        router.push("/verify");
      } else {
        // Sign in existing user
        const user = await signInWithEmail(sanitizedEmail, sanitizedPassword);

        if (!user.emailVerified) {
          setError("Please verify your email address before signing in. Check your email for the verification link.");
          setNeedsVerification(true);
          return;
        }
        console.log("User signed in:", user);
        // Store user data in localStorage
        localStorage.setItem("userName", user.displayName);
        localStorage.setItem("userIsAdmin", user.isAdmin.toString());
        localStorage.setItem("userUid", user.uid);

        // Dispatch storage event to update header
        window.dispatchEvent(new Event('storage'));

        // Redirect to user page
        router.push("/user");
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-black mb-6 text-center">
          {isNewUser ? "Vytvořit účet" : "Přihlášení uživatele"}
        </h1>

        <p className="text-gray-600 mb-6 text-center">
          {isNewUser
            ? "Vytvořte si nový účet pro přístup k platformě FairyTale."
            : "Přihlaste se ke svému účtu"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              E-mailová adresa
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Zadejte svou e-mailovou adresu"
              required
            />
          </div>

          {isNewUser && (
            <div className="mb-4">
              <label htmlFor="displayName" className="block text-gray-700 font-medium mb-2">
                Zobrazované jméno
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Zadejte své zobrazované jméno"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Heslo
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Zadejte své heslo"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {isNewUser && (
              <p className="mt-2 text-sm text-gray-500">
                Heslo bude bezpečně zahashováno a uloženo.
              </p>
            )}
          </div>

          {isNewUser && (
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
                Potvrďte heslo
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 ${
                    password && confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-amber-500'
                  }`}
                  placeholder="Potvrďte své heslo"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-sm text-red-600">
                  Hesla se neshodují
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
              {success}
            </div>
          )}

          {needsVerification && !success && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-md">
              <p className="mb-2">Potřebujete ověřit svůj e-mail?</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await resendVerificationEmail();
                    setSuccess("Ověřovací e-mail byl odeslán! Zkontrolujte prosím svou schránku.");
                  } catch (error) {
                    setError("Nepodařilo se znovu odeslat ověřovací e-mail. Zkuste to prosím znovu.");
                  }
                }}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Znovu odeslat ověřovací e-mail
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-green-900 py-2 px-4 rounded-full hover:from-amber-400 hover:to-yellow-500 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Prosím čekejte..." : (isNewUser ? "Vytvořit účet" : "Přihlásit se")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">
            {isNewUser
              ? "Vytvořte si účet pomocí e-mailu a hesla. Obdržíte ověřovací e-mail."
              : "Zadejte svůj e-mail a heslo pro přihlášení."}
          </p>
          <button
            onClick={() => {
              setIsNewUser(!isNewUser);
              setError("");
              setSuccess("");
              setEmail("");
              setDisplayName("");
              setPassword("");
              setConfirmPassword("");
              setShowPassword(false);
              setShowConfirmPassword(false);
              setNeedsVerification(false);
              // Update URL without causing a page reload
              const newMode = !isNewUser ? 'signup' : 'login';
              const newUrl = newMode === 'signup' ? '/login?mode=signup' : '/login';
              window.history.replaceState({}, '', newUrl);
            }}
            className="text-amber-700 hover:text-amber-800 underline"
          >
            {isNewUser ? "Již máte účet? Přihlaste se" : "Nemáte účet? Vytvořte si ho"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Hero
        title="Přihlášení"
        subtitle="Vítejte zpět v kouzelném lese."
        height="sm"
      />
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </>
  );
}