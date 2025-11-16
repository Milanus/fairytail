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
    console.log(`❌ NON-ADMIN CHECK: No user logged in`);
    return true; // No user = not admin
  }
  
  if (!user.isAdmin) {
    console.log(`✅ NON-ADMIN CONFIRMED:`);
    console.log(`  User ID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName || ""}`);
    console.log(`  Status: REGULAR USER (NOT ADMIN)`);
    console.log(`  Email Verified: ${user.emailVerified ? 'YES' : 'NO'}`);
    console.log(`  ──────────────────────────────`);
    return true;
  } else {
    console.log(`⚠️ ADMIN DETECTED (Not Non-Admin):`);
    console.log(`  User ID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName || ""}`);
    console.log(`  Status: ADMIN USER`);
    console.log(`  ──────────────────────────────`);
    return false;
  }
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

    console.log("✅ NEW USER CREATED:");
    console.log(`  User ID: ${user.uid}`);
    console.log(`  Email: ${email}`);
    console.log(`  Display Name: ${displayName}`);
    console.log(`  Admin Status: REGULAR USER (no isAdmin field set)`);
    console.log(`  Email Verification: Sent`);
    console.log(`  ──────────────────────────────`);
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
    const isAdmin = (userData?.isAdmin ?? false) || false;
    
    // Log admin status for debugging
    console.log(`🔐 User Login - Admin Status Check:`);
    console.log(`  User ID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName || userData.displayName || ""}`);
    console.log(`  isAdmin Field in DB: ${userData?.isAdmin}`);
    console.log(`  Final isAdmin Result: ${isAdmin}`);
    console.log(`  Email Verified: ${user.emailVerified}`);
    
    // Log the complete user object for debugging
    console.log(`📋 COMPLETE FIREBASE USER OBJECT:`);
    console.log(user);
    console.log(`📋 COMPLETE FIRESTORE USER DATA:`);
    console.log(userData);
    console.log(`  ──────────────────────────────`);
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || userData.displayName || "",
      isAdmin,
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

  // Log current user info
  if (isAdmin) {
    console.log(`👑 CURRENT USER (Admin):`);
    console.log(`  User ID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName || ""}`);
    console.log(`  Admin Status: ADMIN`);
    console.log(`  Email Verified: ${emailVerified ? 'YES' : 'NO'}`);
    console.log(`  localStorage userIsAdmin: ${localStorage.getItem('userIsAdmin')}`);
  } else {
    console.log(`👤 CURRENT USER (Regular):`);
    console.log(`  User ID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName || ""}`);
    console.log(`  Admin Status: REGULAR USER`);
    console.log(`  Email Verified: ${emailVerified ? 'YES' : 'NO'}`);
    console.log(`  localStorage userIsAdmin: ${localStorage.getItem('userIsAdmin')}`);
  }

  // Log the complete current user object for debugging
  console.log(`📋 COMPLETE CURRENT USER OBJECT:`);
  console.log({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    isAdmin: isAdmin || false,
    emailVerified,
  });
  
  // Log Firebase Auth user object (contains more details)
  console.log(`📋 COMPLETE FIREBASE AUTH USER OBJECT:`);
  console.log(user);
  
  console.log(`  ──────────────────────────────`);

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
    
    console.log(`🚀 ADMIN STATUS UPDATE:`);
    console.log(`  Target User ID: ${userId}`);
    console.log(`  New Admin Status: ${isAdmin ? 'TRUE (Admin)' : 'FALSE (Regular User)'}`);
    console.log(`  Updated by: ${currentUser.displayName} (${currentUser.email})`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);
    console.log(`  ──────────────────────────────`);
  } catch (error) {
    console.error("Error updating user admin status:", error);
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
    
    console.log(`👤 User Profile Fetched:`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Email: ${userData.email || "N/A"}`);
    console.log(`  Display Name: ${userData.displayName || "N/A"}`);
    console.log(`  Admin Status: ${isAdmin ? 'ADMIN' : 'REGULAR USER'}`);
    console.log(`  Email Verified: ${userData.emailVerified ? 'YES' : 'NO'}`);
    console.log(`  ──────────────────────────────`);
    
    return {
      uid: userId,
      email: userData.email || "",
      displayName: userData.displayName || "",
      isAdmin,
      emailVerified: userData.emailVerified || false,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
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