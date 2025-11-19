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
import { ref, set, get, remove } from "firebase/database";
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, updateDoc } from "firebase/firestore";

// User interface for both databases
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  emailVerified: boolean;
  createdAt?: any;
  lastLogin?: number;
}

// Admin permissions interface
export interface AdminPermissions {
  canDeleteUsers: boolean;
  canEditStories: boolean;
  canDeleteStories: boolean;
  canApproveStories: boolean;
  canManageAdmins: boolean;
  canViewAnalytics: boolean;
}

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
  
    console.log('[AUTH] User signed in:', { uid: user.uid, email: user.email });
  
    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      console.error('[AUTH] User profile not found in Firestore for:', user.uid);
      throw new Error("User profile not found");
    }
    console.log('loging if user have data ');
    const userData = userDoc.data();
    console.log('[AUTH] Raw Firestore data:', userData);
    
    // Explicitly check for isAdmin field
    const isAdmin = userData?.isAdmin === true;
    
    console.log('[AUTH] User profile loaded from Firestore:', {
      uid: user.uid,
      displayName: userData.displayName,
      email: userData.email,
      isAdmin: isAdmin,
      hasIsAdminField: 'isAdmin' in userData,
      isAdminValue: userData?.isAdmin,
      isAdminType: typeof userData?.isAdmin
    });
    
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
    
    console.log('[AUTH] User data synced to Realtime Database with isAdmin:', isAdmin);
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || userData.displayName || "",
      isAdmin,
      emailVerified: user.emailVerified,
    };
  } catch (error: any) {
    console.error('[AUTH] Sign in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<void> {
  try {
    const user = auth.currentUser;
    console.log('[AUTH] Signing out user:', user?.uid);
    await signOut(auth);
    console.log('[AUTH] User signed out successfully');
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userName');
      localStorage.removeItem('userIsAdmin');
      localStorage.removeItem('userUid');
      console.log('[AUTH] LocalStorage cleared');
    }
  } catch (error) {
    console.error('[AUTH] Error during sign out:', error);
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
 * Get default admin permissions
 * @returns AdminPermissions object with all permissions enabled
 */
export function getDefaultAdminPermissions(): AdminPermissions {
  return {
    canDeleteUsers: true,
    canEditStories: true,
    canDeleteStories: true,
    canApproveStories: true,
    canManageAdmins: true,
    canViewAnalytics: true,
  };
}

/**
 * Sync user from Firestore to Realtime Database
 * @param userId - User ID to sync
 * @returns Promise that resolves when sync is complete
 */
export async function syncUserToRealtimeDB(userId: string): Promise<void> {
  try {
    // Get user from Firestore
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      console.log(`[SYNC] User ${userId} not found in Firestore`);
      return;
    }

    const userData = userDoc.data();
    const isAdmin = userData?.isAdmin ?? false;

    // Sync to Realtime Database
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, {
      uid: userId,
      email: userData.email || "",
      displayName: userData.displayName || "",
      isAdmin: isAdmin,
      emailVerified: userData.emailVerified || false,
      createdAt: userData.createdAt?.toMillis?.() || Date.now(),
      lastSync: Date.now()
    });

    console.log(`[SYNC] User ${userId} synced to Realtime Database`);
  } catch (error) {
    console.error(`[SYNC] Error syncing user ${userId}:`, error);
    throw error;
  }
}

/**
 * Sync user from Realtime Database to Firestore
 * @param userId - User ID to sync
 * @returns Promise that resolves when sync is complete
 */
export async function syncUserToFirestore(userId: string): Promise<void> {
  try {
    // Get user from Realtime Database
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      console.log(`[SYNC] User ${userId} not found in Realtime Database`);
      return;
    }

    const userData = snapshot.val();

    // Sync to Firestore
    await setDoc(doc(db, "users", userId), {
      uid: userId,
      email: userData.email || "",
      displayName: userData.displayName || "",
      isAdmin: userData.isAdmin || false,
      emailVerified: userData.emailVerified || false,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      lastSync: new Date()
    }, { merge: true });

    console.log(`[SYNC] User ${userId} synced to Firestore`);
  } catch (error) {
    console.error(`[SYNC] Error syncing user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all users from both Firestore and Realtime Database
 * @returns Promise that resolves to object with users from both databases
 */
export async function getAllUsers(): Promise<{
  firestoreUsers: UserData[];
  realtimeUsers: UserData[];
  duplicates: string[];
  onlyInFirestore: string[];
  onlyInRealtime: string[];
}> {
  try {
    // Get users from Firestore
    const firestoreSnapshot = await getDocs(collection(db, "users"));
    const firestoreUsers: UserData[] = [];
    const firestoreIds = new Set<string>();

    firestoreSnapshot.forEach((doc) => {
      const data = doc.data();
      firestoreIds.add(doc.id);
      firestoreUsers.push({
        uid: doc.id,
        email: data.email || "",
        displayName: data.displayName || "",
        isAdmin: data.isAdmin || false,
        emailVerified: data.emailVerified || false,
        createdAt: data.createdAt,
      });
    });

    // Get users from Realtime Database
    const realtimeRef = ref(database, "users");
    const realtimeSnapshot = await get(realtimeRef);
    const realtimeUsers: UserData[] = [];
    const realtimeIds = new Set<string>();

    if (realtimeSnapshot.exists()) {
      const data = realtimeSnapshot.val();
      Object.keys(data).forEach((uid) => {
        realtimeIds.add(uid);
        realtimeUsers.push({
          uid: uid,
          email: data[uid].email || "",
          displayName: data[uid].displayName || "",
          isAdmin: data[uid].isAdmin || false,
          emailVerified: data[uid].emailVerified || false,
          createdAt: data[uid].createdAt,
          lastLogin: data[uid].lastLogin,
        });
      });
    }

    // Find duplicates and differences
    const duplicates = Array.from(firestoreIds).filter(id => realtimeIds.has(id));
    const onlyInFirestore = Array.from(firestoreIds).filter(id => !realtimeIds.has(id));
    const onlyInRealtime = Array.from(realtimeIds).filter(id => !firestoreIds.has(id));

    console.log(`[SYNC] Users analysis:`, {
      firestore: firestoreUsers.length,
      realtime: realtimeUsers.length,
      duplicates: duplicates.length,
      onlyInFirestore: onlyInFirestore.length,
      onlyInRealtime: onlyInRealtime.length,
    });

    return {
      firestoreUsers,
      realtimeUsers,
      duplicates,
      onlyInFirestore,
      onlyInRealtime,
    };
  } catch (error) {
    console.error("[SYNC] Error getting all users:", error);
    throw error;
  }
}

/**
 * Sync all users from Firestore to Realtime Database
 * @returns Promise that resolves when all users are synced
 */
export async function syncAllUsersToRealtime(): Promise<void> {
  try {
    const { firestoreUsers } = await getAllUsers();
    
    for (const user of firestoreUsers) {
      await syncUserToRealtimeDB(user.uid);
    }
    
    console.log(`[SYNC] All ${firestoreUsers.length} users synced to Realtime Database`);
  } catch (error) {
    console.error("[SYNC] Error syncing all users to Realtime:", error);
    throw error;
  }
}

/**
 * Delete user from both databases
 * @param userId - User ID to delete
 * @param currentUser - Current admin user performing the deletion
 * @returns Promise that resolves when user is deleted
 */
export async function deleteUserFromBothDatabases(userId: string, currentUser: UserData): Promise<void> {
  if (!currentUser || !currentUser.isAdmin) {
    throw new Error("Only administrators can delete users");
  }

  try {
    // Delete from Firestore
    await deleteDoc(doc(db, "users", userId));
    console.log(`[DELETE] User ${userId} deleted from Firestore`);

    // Delete from Realtime Database
    const userRef = ref(database, `users/${userId}`);
    await remove(userRef);
    console.log(`[DELETE] User ${userId} deleted from Realtime Database`);
  } catch (error) {
    console.error(`[DELETE] Error deleting user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update user admin status in both databases
 * @param userId - User ID to update
 * @param isAdmin - Admin status to set
 * @param permissions - Optional admin permissions (defaults to all permissions)
 * @returns Promise that resolves when admin status is updated
 */
export async function setUserAdminStatus(
  userId: string, 
  isAdmin: boolean, 
  permissions?: AdminPermissions
): Promise<void> {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    throw new Error("Only administrators can update user admin status");
  }

  try {
    const adminPermissions = permissions || getDefaultAdminPermissions();

    // Update in Firestore
    await updateDoc(doc(db, "users", userId), {
      isAdmin: isAdmin,
      adminPermissions: isAdmin ? adminPermissions : null,
      updatedAt: new Date(),
    });
    console.log(`[ADMIN] User ${userId} admin status updated in Firestore: ${isAdmin}`);

    // Update in Realtime Database
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      await set(userRef, {
        ...userData,
        isAdmin: isAdmin,
        adminPermissions: isAdmin ? adminPermissions : null,
        updatedAt: Date.now(),
      });
      console.log(`[ADMIN] User ${userId} admin status updated in Realtime Database: ${isAdmin}`);
    }
  } catch (error) {
    console.error(`[ADMIN] Error updating admin status for user ${userId}:`, error);
    throw error;
  }
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