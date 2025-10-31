import { ref, onValue, off } from "firebase/database";
import { database } from "./firebase";

// Define the Story type
export interface Story {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  author_id: string;
  status: string;
  created_at: number; // Firebase timestamp
  updated_at: number; // Firebase timestamp
  published_at: number; // Firebase timestamp
  tags: string[];
  likes_count: number;
  views_count: number;
  likes?: number; // For client-side sorting compatibility
  createdAt?: number | string; // For client-side sorting compatibility
}

// Function to fetch stories once
export const fetchStoriesOnce = (statusFilter?: string): Promise<Story[]> => {
  return new Promise((resolve, reject) => {
    const storiesRef = ref(database, 'fairy_tales');
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let stories: Story[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));

        // Filter by status if specified
        if (statusFilter) {
          stories = stories.filter(story => story.status === statusFilter);
        }

        resolve(stories);
      } else {
        resolve([]);
      }
      // Unsubscribe after first value
      unsubscribe();
    }, (error) => {
      reject(error);
    });
  });
};

// Function to subscribe to stories in real-time
export const subscribeToStories = (callback: (stories: Story[]) => void, statusFilter?: string): (() => void) => {
  const storiesRef = ref(database, 'fairy_tales');
  const unsubscribe = onValue(storiesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      let stories: Story[] = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));

      // Filter by status if specified
      if (statusFilter) {
        stories = stories.filter(story => story.status === statusFilter);
      }

      callback(stories);
    } else {
      callback([]);
    }
  });

  // Return the unsubscribe function
  return () => off(storiesRef);
};

// Function to fetch a single story by ID
export const fetchStoryById = (id: string): Promise<Story | null> => {
  return new Promise((resolve, reject) => {
    const storyRef = ref(database, `fairy_tales/${id}`);
    const unsubscribe = onValue(storyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        resolve({
          id,
          ...data
        });
      } else {
        resolve(null);
      }
      // Unsubscribe after first value
      unsubscribe();
    }, (error) => {
      reject(error);
    });
  });
};