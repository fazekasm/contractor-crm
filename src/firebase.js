import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
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

// TODO: Get reCAPTCHA v3 site key from https://console.cloud.google.com/security/recaptcha
// Then replace 'RECAPTCHA_SITE_KEY_HERE' with your actual key and uncomment:
// const appCheck = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider('RECAPTCHA_SITE_KEY_HERE'),
//   isTokenAutoRefreshEnabled: true,
// });
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { ref as storageRef, uploadString, getDownloadURL, deleteObject };
const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, provider);
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
