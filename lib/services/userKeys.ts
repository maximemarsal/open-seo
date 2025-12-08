import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";

export interface UserApiKeys {
  openaiKey?: string;
  perplexityKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  deepseekKey?: string;
  qwenKey?: string;
  grokKey?: string;
  unsplashKey?: string;
  wordpressUrl?: string;
  wordpressUsername?: string;
  wordpressPassword?: string;
}

/**
 * Save user API keys to Firestore
 * Keys are stored in /users/{userId}/private/apiKeys
 * This function MERGES with existing keys, preserving any keys not provided
 * Empty strings will DELETE the corresponding field from Firestore
 */
export async function saveUserApiKeys(
  userId: string,
  keys: UserApiKeys
): Promise<void> {
  const docRef = doc(db, "users", userId, "private", "apiKeys");
  
  // Separate keys into: to update vs to delete
  const keysToUpdate: Record<string, any> = {};
  const keysToDelete: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(keys)) {
    if (value && value.trim() !== "") {
      // Non-empty: update/add the key
      keysToUpdate[key] = value;
    } else {
      // Empty string: mark for deletion
      keysToDelete[key] = deleteField();
    }
  }
  
  // Merge updates and deletions
  const updates = {
    ...keysToUpdate,
    ...keysToDelete,
    updatedAt: new Date().toISOString(),
  };
  
  await setDoc(docRef, updates, { merge: true });
}

/**
 * Get user API keys from Firestore
 */
export async function getUserApiKeys(
  userId: string
): Promise<UserApiKeys | null> {
  const docRef = doc(db, "users", userId, "private", "apiKeys");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // Remove metadata fields
    const { updatedAt, ...keys } = data;
    return keys as UserApiKeys;
  }

  return null;
}
