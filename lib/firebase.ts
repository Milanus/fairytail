import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Realtime Database
export const database = getDatabase(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Function to delete files from Firebase Storage
export const deleteFromStorage = async (url: string) => {
  try {
    // Extract the path from the Firebase Storage URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlParts = url.split('/o/');
    if (urlParts.length < 2) {
      throw new Error('Invalid Firebase Storage URL');
    }

    const pathWithToken = urlParts[1];
    const path = decodeURIComponent(pathWithToken.split('?')[0]);

    const { deleteObject, ref: storageRef } = await import('firebase/storage');
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);
    console.log(`Successfully deleted file: ${path}`);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw error;
  }
};

// Export the app for potential use elsewhere
export default app;