import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Messaging
export const messaging = getMessaging(app);


// Function to sign up with a unique username
export const signUp = async (username, password) => {
  const usersCollection = collection(db, "users");
  const usernameQuery = query(usersCollection, where("username", "==", username));
  const usernameSnapshot = await getDocs(usernameQuery);

  if (!usernameSnapshot.empty) {
    throw new Error("Username already exists");
  }

  const email = `${username}@fleetcom7.com`;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    username,
    uid: user.uid,
  });

  return user;
};

// Function to log in with username and password
export const login = async (username, password) => {
  const usersCollection = collection(db, "users");
  const usernameQuery = query(usersCollection, where("username", "==", username));
  const usernameSnapshot = await getDocs(usernameQuery);

  if (usernameSnapshot.empty) {
    throw new Error("Username not found");
  }

  const userDoc = usernameSnapshot.docs[0];
  const email = `${username}@fleetcom7.com`;

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

//google sign in
export const googleSignIn = async () => {
  const auth = getAuth();
  const googleProvider = new GoogleAuthProvider();

  try {
    // Log before attempting to sign in
    console.log('Attempting Google Sign-In...');
    
    // Sign in with Google
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google Sign-In successful:', result);

    // Get the signed-in user
    const user = result.user;
    console.log('Signed in user:', user);

    // Check if user document exists in Firestore
    const ensureUserDocumentExists = async (user) => {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          username: user.displayName || "Anonymous",
          uid: user.uid,
          profilePic: user.photoURL || null,
        });
      }
    };
    await ensureUserDocumentExists(user);
    
    // Return the signed-in user
    return user;

  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      // This error occurs if the user closes the popup before completing authentication
      console.warn('Google Sign-In popup was closed by the user before completing the process.');
    } else {
      // Log any other errors that occur
      console.error('Error during Google Sign-In:', error);
    }
    throw error;
  }
};

// Function to log out
export const logout = async () => {
  await signOut(auth);
};

// Real-time listener for auth state changes
export const onUserProfileChange = (callback) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await syncUserProfile(user);
      callback(user);
    } else {
      callback(null);
    }
  });  
};

// Sync the user's profile (name and profile picture) to Firestore
export const syncUserProfile = async (user) => {
  if (user) {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      username: user.displayName || "Anonymous",
      profilePic: user.photoURL || null,
    }, { merge: true });
  }
};

// Function to update username in all previous messages
export const updateUsernameInMessages = async (oldUsername, newUsername) => {
  const messagesCollection = collection(db, "messages");
  const messagesQuery = query(messagesCollection, where("username", "==", oldUsername));
  const messagesSnapshot = await getDocs(messagesQuery);

  const updates = messagesSnapshot.docs.map((doc) => {
    const messageRef = doc.ref;
    return updateDoc(messageRef, { username: newUsername });
  });
  await Promise.all(updates);  
};
