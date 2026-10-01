import { initializeApp } from "firebase/app";
// Change import: add initializeAuth and getReactNativePersistence
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
// Import AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore"; // <-- ADD THIS


// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB_wDSoSc_niTfAQnNITizhOokbMFOJnQ8",
  authDomain: "hair-maxxing-d7b54.firebaseapp.com",
  projectId: "hair-maxxing-d7b54",
  storageBucket: "hair-maxxing-d7b54.firebasestorage.app",
  messagingSenderId: "1000400594570",
  appId: "1:1000400594570:web:a79c3561739dffe677ef73"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage Persistence
// This fixes the "Auth state will default to memory persistence" warning
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app); // <-- ADD THIS