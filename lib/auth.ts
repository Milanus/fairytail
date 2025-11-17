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
 * Check if current user is NOT an admin and log the result
 * @returns boolean true if user is NOT admin (regular user), false if admin or not logged in
 */
export function checkIfNotAdmin(): boolean {
  const user = getCurrentUser();
  
  if (!user) {
    return true; // No user = not admin
  }
  
  return !user.isAdmin;
}

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

    // Create user profile in Firestore with unique ID (isAdmin is optional, defaults to false)
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      createdAt: new Date(),
      emailVerified: false,
    });
  } catch (error: any) {
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
    const isAdmin = (userData?.isAdmin ?? false) || false;
    
    // Sync user data to Realtime Database for rules to work
    const userRef = ref(database, `users/${user.uid}`);
    await set(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || userData.displayName || "",
      isAdmin: isAdmin,
      emailVerified: user.emailVerified,
      lastLogin: Date.now()
    });
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || userData.displayName || "",
      isAdmin,
      emailVerified: user.emailVerified,
    };
  } catch (error: any) {
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
    isAdmin: isAdmin || false,
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
 * Update user admin status
 * @param userId - User ID to update
 * @param isAdmin - Admin status to set
 * @returns Promise that resolves when admin status is updated
 */
export async function updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    throw new Error("Only administrators can update user admin status");
  }

  try {
    await setDoc(doc(db, "users", userId), {
      isAdmin: isAdmin,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    throw new Error("Failed to update user admin status");
  }
}

/**
 * Get user profile with optional admin check
 * @param userId - User ID to fetch
 * @returns Promise that resolves to user profile data
 */
export async function getUserProfile(userId: string): Promise<{ uid: string; email: string; displayName: string; isAdmin: boolean; emailVerified: boolean } | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const isAdmin = userData?.isAdmin ?? false;
    
    return {
      uid: userId,
      email: userData.email || "",
      displayName: userData.displayName || "",
      isAdmin,
      emailVerified: userData.emailVerified || false,
    };
  } catch (error) {
    return null;
  }
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
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your Firebase configuration';
    default:
      return 'An error occurred. Please try again';
  }
}

/**
 * Legacy functions for backward compatibility (deprecated)
 * These will be removed once all components are updated
 */

export function generateUserHash(name: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  return `${name.replace(/\s+/g, '-').toLowerCase()}-${time.toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

export function validateUserHash(hash: string): boolean {
  const hashRegex = /^[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+$/;
  return hashRegex.test(hash) && hash.length > 10;
}

export async function checkUsernameExists(name: string): Promise<boolean> {
  return false; // Always return false for new auth system
}

export async function saveUserToFirebase(name: string, password: string, isAdmin: boolean = false): Promise<void> {
  throw new Error("This function is deprecated. Use signUpWithEmail instead.");
}

export async function validateUserCredentials(name: string, password: string): Promise<{ name: string; isAdmin: boolean } | null> {
  return null;
}

export async function getCurrentUserWithAdmin(): Promise<{ name: string; isAdmin: boolean } | null> {
  const user = getCurrentUser();
  if (!user) return null;
  return { name: user.displayName, isAdmin: user.isAdmin };
}

export function logout(): void {
  signOutUser().catch(() => {});
}