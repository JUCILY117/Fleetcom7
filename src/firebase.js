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
export const messaging = getMessaging(app);


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

export const googleSignIn = async () => {
  const auth = getAuth();
  const googleProvider = new GoogleAuthProvider();

  try {
    console.log('Attempting Google Sign-In...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google Sign-In successful:', result);

    const user = result.user;
    console.log('Signed in user:', user);

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
    return user;

  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.warn('Google Sign-In popup was closed by the user before completing the process.');
    } else {
      console.error('Error during Google Sign-In:', error);
    }
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

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

export const syncUserProfile = async (user) => {
  if (user) {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      username: user.displayName || "Anonymous",
      profilePic: user.photoURL || null,
    }, { merge: true });
  }
};

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
