// Firebase Authentication utility functions
import { auth, database, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User,
  updateProfile
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { doc, setDoc, getDoc } from "firebase/firestore";

/**
 * Sign up a new user with email and password
 * @param email - User's email
 * @param password - User's password
 * @param displayName - User's display name
 * @returns Promise that resolves when user is created and verification email sent
 */
export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<void> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName });

    // Send email verification
    await sendEmailVerification(user);

    // Create user profile in Firestore with unique ID
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      createdAt: new Date(),
      isAdmin: false,
      emailVerified: false,
    });

    console.log("User created and verification email sent");
  } catch (error: any) {
    console.error("Error signing up:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Sign in with email and password
 * @param email - User's email
 * @param password - User's password
 * @returns Promise that resolves to user data
 */
export async function signInWithEmail(email: string, password: string): Promise<{ uid: string; email: string; displayName: string; isAdmin: boolean; emailVerified: boolean }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User profile not found");
    }

    const userData = userDoc.data();
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || userData.displayName || "",
      isAdmin: userData.isAdmin || false,
      emailVerified: user.emailVerified,
    };
  } catch (error: any) {
    console.error("Error signing in:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userName');
      localStorage.removeItem('userIsAdmin');
      localStorage.removeItem('userUid');
    }
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Get current authenticated user
 * @returns User object or null if not authenticated
 */
export function getCurrentUser(): { uid: string; email: string; displayName: string; isAdmin: boolean; emailVerified: boolean } | null {
  if (typeof window === 'undefined') return null;

  const user = auth.currentUser;
  if (!user) return null;

  // Get additional data from localStorage (set during sign in)
  const isAdmin = localStorage.getItem('userIsAdmin') === 'true';
  const emailVerified = user.emailVerified;

  return {
    uid: user.uid,
    email: user.email!,
    displayName: user.displayName || "",
    isAdmin,
    emailVerified,
  };
}

/**
 * Check if user is authenticated
 * @returns boolean indicating if user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Listen to authentication state changes
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Resend email verification
 * @returns Promise that resolves when email is sent
 */
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user signed in");
  }

  try {
    await sendEmailVerification(user);
  } catch (error: any) {
    console.error("Error resending verification email:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Get user-friendly error messages for Firebase Auth errors
 * @param errorCode - Firebase Auth error code
 * @returns User-friendly error message
 */
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    default:
      return 'An error occurred. Please try again';
  }
}

/**
 * Legacy functions for backward compatibility (deprecated)
 * These will be removed once all components are updated
 */

export function generateUserHash(name: string, timestamp?: number): string {
  console.warn("generateUserHash is deprecated. Use Firebase Auth instead.");
  const time = timestamp || Date.now();
  return `${name.replace(/\s+/g, '-').toLowerCase()}-${time.toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

export function validateUserHash(hash: string): boolean {
  console.warn("validateUserHash is deprecated. Use Firebase Auth instead.");
  const hashRegex = /^[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+$/;
  return hashRegex.test(hash) && hash.length > 10;
}

export async function checkUsernameExists(name: string): Promise<boolean> {
  console.warn("checkUsernameExists is deprecated. Use Firebase Auth instead.");
  return false; // Always return false for new auth system
}

export async function saveUserToFirebase(name: string, password: string, isAdmin: boolean = false): Promise<void> {
  console.warn("saveUserToFirebase is deprecated. Use signUpWithEmail instead.");
  throw new Error("This function is deprecated. Use signUpWithEmail instead.");
}

export async function validateUserCredentials(name: string, password: string): Promise<{ name: string; isAdmin: boolean } | null> {
  console.warn("validateUserCredentials is deprecated. Use signInWithEmail instead.");
  return null;
}

export async function getCurrentUserWithAdmin(): Promise<{ name: string; isAdmin: boolean } | null> {
  console.warn("getCurrentUserWithAdmin is deprecated. Use getCurrentUser instead.");
  const user = getCurrentUser();
  if (!user) return null;
  return { name: user.displayName, isAdmin: user.isAdmin };
}

export function logout(): void {
  console.warn("logout is deprecated. Use signOutUser instead.");
  signOutUser().catch(console.error);
}