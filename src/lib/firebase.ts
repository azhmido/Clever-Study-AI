import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Mengaktifkan Caching Offline agar aplikasi lebih cepat (terasa instan saat dimuat ulang)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Sign-in popup was closed by the user.');
      return;
    }
    throw error;
  }
};

export const logout = () => {
  return signOut(auth);
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
