import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
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

const AUTH_KEY = '@app_is_logged_in';
const USER_CREDENTIALS_KEY = '@app_user_credentials';
const ALL_USERS_KEY = '@app_all_users';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const loadAuthState = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
      
      // Migration step: move existing user to all users list if needed
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        const allUsers = await AsyncStorage.getItem(ALL_USERS_KEY);
        if (!allUsers) {
          await AsyncStorage.setItem(ALL_USERS_KEY, JSON.stringify({ [userObj.email]: userObj }));
        }
      }

      const storedAuth = await AsyncStorage.getItem(AUTH_KEY);
      if (storedAuth === 'true') {
        setIsLoggedIn(true);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to load auth state', e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    loadAuthState();
  }, []);

  const register = async (firstName?: string, lastName?: string, email?: string, password?: string) => {
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Please fill in all details.');
    }
    
    const formattedEmail = email.toLowerCase();
    
    // Check if user already exists with this email
    const storedAllUsers = await AsyncStorage.getItem(ALL_USERS_KEY);
    let allUsers = storedAllUsers ? JSON.parse(storedAllUsers) : {};
    
    if (allUsers[formattedEmail]) {
      throw new Error('An account with this email already exists.');
    }

    const newUser = { firstName, lastName, email: formattedEmail, password };
    allUsers[formattedEmail] = newUser;
    
    await AsyncStorage.setItem(ALL_USERS_KEY, JSON.stringify(allUsers));
    await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(newUser));
    
    // Auto login after register
    await AsyncStorage.setItem(AUTH_KEY, 'true');
    setUser(newUser);
    setIsLoggedIn(true);
  };

  const login = async (email?: string, password?: string) => {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    const formattedEmail = email.toLowerCase();
    const storedAllUsers = await AsyncStorage.getItem(ALL_USERS_KEY);
    
    if (!storedAllUsers) {
      throw new Error('Account does not exist. Please sign up first.');
    }

    const allUsers = JSON.parse(storedAllUsers);
    const storedUser = allUsers[formattedEmail];

    if (!storedUser) {
      throw new Error('Account does not exist. Please sign up first.');
    }

    if (storedUser.password === password) {
      await AsyncStorage.setItem(AUTH_KEY, 'true');
      await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(storedUser));
      setUser(storedUser);
      setIsLoggedIn(true);
    } else {
      throw new Error('Incorrect email or password.');
    }
  };

  const updateProfile = async (firstName: string, lastName: string, email: string) => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) throw new Error('Fields cannot be empty.');
    if (!user) throw new Error('User not logged in.');

    const formattedEmail = email.toLowerCase();
    const storedAllUsers = await AsyncStorage.getItem(ALL_USERS_KEY);
    let allUsers = storedAllUsers ? JSON.parse(storedAllUsers) : {};

    if (formattedEmail !== user.email && allUsers[formattedEmail]) {
      throw new Error('An account with this email already exists.');
    }

    const updatedUser = { ...user, firstName, lastName, email: formattedEmail };
    await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(updatedUser));
    
    if (storedAllUsers) {
      if (formattedEmail !== user.email) {
        delete allUsers[user.email];
      }
      allUsers[formattedEmail] = updatedUser;
      await AsyncStorage.setItem(ALL_USERS_KEY, JSON.stringify(allUsers));
    }

    setUser(updatedUser);
  };

  const changePassword = async (oldPassword?: string, newPassword?: string) => {
    if (!oldPassword || !newPassword) {
      throw new Error('Please enter both old and new passwords.');
    }
    if (!user) {
      throw new Error('User not logged in.');
    }

    const storedData = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
    if (!storedData) throw new Error('User data corrupted.');
    
    const storedUser = JSON.parse(storedData);
    if (storedUser.password !== oldPassword) {
      throw new Error('Incorrect current password.');
    }

    const updatedUser = { ...storedUser, password: newPassword };
    await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(updatedUser));
    
    const storedAllUsers = await AsyncStorage.getItem(ALL_USERS_KEY);
    if (storedAllUsers) {
      const allUsers = JSON.parse(storedAllUsers);
      allUsers[updatedUser.email] = updatedUser;
      await AsyncStorage.setItem(ALL_USERS_KEY, JSON.stringify(allUsers));
    }

    setUser(updatedUser);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      setUser(null);
      setIsLoggedIn(false);
    } catch (e) {
      console.error('Failed to clear auth state', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, user, login, register, logout, updateProfile, changePassword, refreshAuth: loadAuthState, isAuthLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

