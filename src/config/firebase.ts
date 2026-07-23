import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCFcBhLFtOqqU5J6aU33mv5lJNi6N-tKxc",
  authDomain: "dailyaccounts-app.firebaseapp.com",
  projectId: "dailyaccounts-app",
  storageBucket: "dailyaccounts-app.firebasestorage.app",
  messagingSenderId: "291175978560",
  appId: "1:291175978560:web:39beada26680ee1c4db1a5"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
