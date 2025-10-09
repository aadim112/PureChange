// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALaRVWOsQQ6U05vRvG9AaPb7kNvGJxcfo",
  authDomain: "purechange-f97a6.firebaseapp.com",
  projectId: "purechange-f97a6",
  storageBucket: "purechange-f97a6.firebasestorage.app",
  messagingSenderId: "617671475741",
  appId: "1:617671475741:web:e0f26d60810e400c16bcf4",
  measurementId: "G-1G5J3PGK1P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();