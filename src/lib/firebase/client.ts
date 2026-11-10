// The Firebase Web config contains public project identifiers, NOT an admin secret.
// Never place Firebase service accounts, private keys or R2 credentials in frontend code.
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDoRJsEyziURLmXTDx5BbEYLx4czx1FzsE",
  authDomain: "upper-homadola-school.firebaseapp.com",
  projectId: "upper-homadola-school",
  storageBucket: "upper-homadola-school.firebasestorage.app",
  messagingSenderId: "615366080358",
  appId: "1:615366080358:web:42f148b42b2fc36e33baa7",
  measurementId: "G-5359RYBB13",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
// Call these from client components only. Server rendering must not initialize Auth.
export function getFirebaseAuth() { return getAuth(firebaseApp); }
export function getFirebaseDatabase() { return getFirestore(firebaseApp); }
