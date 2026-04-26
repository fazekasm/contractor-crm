import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCo5uqXEjPExA2e-gimh5BUUDZofoJKonI",
  authDomain: "contractor-crm-792d3.firebaseapp.com",
  projectId: "contractor-crm-792d3",
  storageBucket: "contractor-crm-792d3.firebasestorage.app",
  messagingSenderId: "556672784934",
  appId: "1:556672784934:web:7e0fdf1bf78e79408264e7"
};

const app = initializeApp(firebaseConfig);

try {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LcnvcosAAAAAGZsNIXoilkKEMQ7pxTTXtfPFxOA'),
    isTokenAutoRefreshEnabled: true,
  });
} catch (e) {
  console.warn('App Check init failed, continuing without it:', e);
}
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { ref as storageRef, uploadString, getDownloadURL, deleteObject };
const provider = new GoogleAuthProvider();

export const signInWithGoogle = () =>
  signInWithPopup(auth, provider).catch((err) => {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      return signInWithRedirect(auth, provider);
    }
    throw err;
  });
export const signOutUser = () => signOut(auth);
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

export const loadFromFirestore = async (uid) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const saveToFirestore = async (uid, data) => {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, data);
};
