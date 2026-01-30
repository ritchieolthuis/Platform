import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy, addDoc, where } from 'firebase/firestore';
import { ArticleData, User } from '../types';

// --- Configuration ---
// Note: In a production environment, these should come from process.env
// For this specific 1:1 clone request, we use placeholders or injected env vars.
// The app will gracefully fallback to console warnings if keys are missing.
const firebaseConfig = {
  apiKey: (window as any).process?.env?.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: (window as any).process?.env?.FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: (window as any).process?.env?.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: (window as any).process?.env?.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: (window as any).process?.env?.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: (window as any).process?.env?.FIREBASE_APP_ID || "YOUR_APP_ID"
};

let db: any = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (e) {
  console.warn("Firebase initialization failed (check config keys). App will run without DB persistence.", e);
}

// --- User Services ---

export const ensureUserInDb = async (user: User) => {
  if (!db) return;
  try {
    // 1. Controleer/Maak Gebruikersprofiel (Check & Create Logic)
    const userRef = doc(db, "users", user.id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Maak de gebruiker aan als deze nog niet bestaat
      await setDoc(userRef, { 
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        createdAt: new Date(),
        lastLogin: new Date()
      });
    } else {
      // Update last login
      await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
    }
  } catch (e) {
    console.error("Error connecting to User DB:", e);
  }
};

// --- Library Services ---

export const saveArticleToLibrary = async (userId: string, article: ArticleData) => {
  if (!db) return;
  try {
     // Ensure user exists first (redundancy check for data integrity)
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        await setDoc(userRef, { userId: userId, createdAt: new Date() });
    }

    // 2. Sla artikel op in de Library collectie onder de specifieke gebruiker
    const libraryRef = doc(collection(db, "users", userId, "library"), article.id);
    await setDoc(libraryRef, {
      ...article,
      savedAt: new Date()
    });
  } catch (e) {
    console.error("Error saving to Library DB:", e);
    throw e;
  }
};

export const getLibraryFromDb = async (userId: string): Promise<ArticleData[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "users", userId, "library"), orderBy("savedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Remove DB-specific timestamp to match ArticleData type exactly if needed
        const { savedAt, ...articleData } = data; 
        return articleData as ArticleData;
    });
  } catch (e) {
    console.error("Error fetching library from DB:", e);
    return [];
  }
};

// --- Comment Services ---

export interface DbComment {
  id: string;
  author: string;
  text: string;
  date: string;
  timestamp: any;
}

export const addCommentToDb = async (articleId: string, comment: Omit<DbComment, 'id' | 'timestamp'>) => {
  if (!db) return;
  try {
    // We store comments in a top-level collection 'articles/{id}/comments' to separate concerns
    const commentsRef = collection(db, "articles", articleId, "comments");
    await addDoc(commentsRef, {
      ...comment,
      timestamp: new Date()
    });
  } catch (e) {
    console.error("Error saving comment to DB:", e);
  }
};

export const getCommentsFromDb = async (articleId: string): Promise<DbComment[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "articles", articleId, "comments"), orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DbComment));
  } catch (e) {
    console.error("Error fetching comments from DB:", e);
    return [];
  }
};
