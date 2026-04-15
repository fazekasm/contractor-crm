import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCo5uqXEjPExA2e-gimh5BUUDZofoJKonI",
  authDomain: "contractor-crm-792d3.firebaseapp.com",
  projectId: "contractor-crm-792d3",
  storageBucket: "contractor-crm-792d3.firebasestorage.app",
  messagingSenderId: "556672784934",
  appId: "1:556672784934:web:7e0fdf1bf78e79408264e7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
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
