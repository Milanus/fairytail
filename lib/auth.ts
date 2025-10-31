// Simple hash-based authentication utility functions
import { database } from "./firebase";
import { ref, set, get, onValue } from "firebase/database";

/**
 * Generate a unique hash for a user
 * @param name - User's name
 * @param timestamp - Optional timestamp for uniqueness
 * @returns A unique hash string
 */
export function generateUserHash(name: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  // Simple hash generation (in a real app, you'd use a more secure method)
  return `${name.replace(/\s+/g, '-').toLowerCase()}-${time.toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * Validate a user hash format
 * @param hash - The hash to validate
 * @returns boolean indicating if the hash is valid
 */
export function validateUserHash(hash: string): boolean {
  // Simple validation - check if hash has the expected format
  const hashRegex = /^[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+$/;
  return hashRegex.test(hash) && hash.length > 10;
}

/**
 * Check if username already exists in Firebase
 * @param name - Username to check
 * @returns Promise that resolves to true if username exists, false otherwise
 */
export async function checkUsernameExists(name: string): Promise<boolean> {
  try {
    const userRef = ref(database, `users/${name}`);
    const snapshot = await get(userRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
}

/**
 * Hash a password using a simple hash function (in production, use bcrypt or similar)
 * @param password - Plain text password
 * @returns Hashed password
 */
function hashPassword(password: string): string {
  // Simple hash for demo purposes - in production use proper hashing
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Save a new user to Firebase
 * @param name - User's name (used as key)
 * @param password - User's password
 * @param isAdmin - Whether the user is an admin (default false)
 * @returns Promise that resolves when user is saved
 */
export async function saveUserToFirebase(name: string, password: string, isAdmin: boolean = false): Promise<void> {
  try {
    // Check if username already exists
    const exists = await checkUsernameExists(name);
    if (exists) {
      throw new Error("Username already exists");
    }

    const userRef = ref(database, `users/${name}`);
    await set(userRef, {
      name: name,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
      isAdmin: isAdmin,
    });
  } catch (error) {
    console.error("Error saving user to Firebase:", error);
    throw error;
  }
}

/**
 * Get current user from localStorage
 * @returns User object or null if not logged in
 */
export function getCurrentUser(): { name: string } | null {
  if (typeof window === 'undefined') return null;

  const name = localStorage.getItem('userName');

  if (name) {
    return { name };
  }

  return null;
}

/**
 * Get current user with admin status from Firebase
 * @returns User object with admin status or null if not logged in
 */
export async function getCurrentUserWithAdmin(): Promise<{ name: string; isAdmin: boolean } | null> {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  try {
    const userRef = ref(database, `users/${currentUser.name}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();
      return { name: currentUser.name, isAdmin: userData.isAdmin || false };
    }

    return null;
  } catch (error) {
    console.error("Error fetching current user with admin:", error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns boolean indicating if user is authenticated
 */
export function isAuthenticated(): boolean {
  const user = getCurrentUser();
  return user !== null;
}

/**
 * Logout the current user
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userName');
    localStorage.removeItem('userIsAdmin');
  }
}

/**
 * Validate user credentials against Firebase
 * @param name - User's name (used as key)
 * @param password - User's password
 * @returns Promise that resolves to user data if valid, null otherwise
 */
export async function validateUserCredentials(name: string, password: string): Promise<{ name: string; isAdmin: boolean } | null> {
  try {
    const userRef = ref(database, `users/${name}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userData.passwordHash === hashPassword(password)) {
        return { name, isAdmin: userData.isAdmin || false };
      }
    }

    return null;
  } catch (error) {
    console.error("Error validating user credentials:", error);
    return null;
  }
}