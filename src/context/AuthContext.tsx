import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as firebaseUpdateProfile,
  updatePassword,
  onAuthStateChanged,
  User as FirebaseUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface User {
  uid?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (email?: string, password?: string) => Promise<void>;
  register: (firstName?: string, lastName?: string, email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (firstName: string, lastName: string, email: string) => Promise<void>;
  changePassword: (oldPassword?: string, newPassword?: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
  refreshAuth: async () => {},
  isAuthLoading: true,
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        const nameParts = (firebaseUser.displayName || '').split(' ');
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || ''
        });
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (firstName?: string, lastName?: string, email?: string, password?: string) => {
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Please fill in all details.');
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
      await firebaseUpdateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Update local state immediately so names don't disappear
      setUser({
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        firstName,
        lastName
      });
      
      // Store user details in Firestore
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid, 'profile', 'details'), {
          firstName,
          lastName,
          email: email.toLowerCase()
        }, { merge: true });

        // WARNING: Highly insecure practice
        await setDoc(doc(db, 'users', userCredential.user.uid, 'profile', 'security'), {
          password: password
        }, { merge: true });
      } catch (e) {
        console.error("Failed to save profile to firestore", e);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please login instead.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      } else {
        throw new Error('Failed to create account. Please try again.');
      }
    }
    // State is automatically updated by onAuthStateChanged
  };

  const login = async (email?: string, password?: string) => {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }
    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new Error('User not found. Please register with this email.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('User not found or incorrect password. Please register if you do not have an account.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else {
        throw new Error(error.message || 'Failed to login.');
      }
    }
    // State is automatically updated by onAuthStateChanged
  };

  const updateProfile = async (firstName: string, lastName: string, email: string) => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) throw new Error('Fields cannot be empty.');
    
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not logged in.');

    await firebaseUpdateProfile(currentUser, {
      displayName: `${firstName} ${lastName}`
    });
    
    // Store user details in Firestore
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'profile', 'details'), {
        firstName,
        lastName,
        email: email.toLowerCase()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to update profile details in firestore", e);
    }
    
    // Note: Updating email requires re-authentication or verification in Firebase,
    // so we'll skip updating the email directly here for simplicity, or just update the display name.
    
    setUser({
      ...user,
      firstName,
      lastName,
      email: currentUser.email || email
    });
  };

  const changePassword = async (oldPassword?: string, newPassword?: string) => {
    if (!oldPassword || !newPassword) {
      throw new Error('Please enter both old and new passwords.');
    }
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('User not logged in.');
    }

    const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
    
    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      // Update plain text password in Firestore
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'profile', 'security'), {
          password: newPassword
        }, { merge: true });
      } catch (e) {
        console.error("Failed to save new password to firestore", e);
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        throw new Error('Incorrect current password. Please try again.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('New password should be at least 6 characters.');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please log out and log back in to change your password for security reasons.');
      } else {
        throw new Error('Failed to change password. Please try again.');
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Failed to logout', e);
    }
  };

  const refreshAuth = async () => {
    // onAuthStateChanged handles this automatically, but we keep the method for interface compatibility
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, user, login, register, logout, updateProfile, changePassword, refreshAuth, isAuthLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
