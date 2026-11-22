"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";

interface LoginHistoryEntry {
  browser: string;
  os: string;
  device: string;
  ip: string;
  timestamp: string;
}

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  email: string;
  website: string;
  location: string;
  phone?: string;
  notificationsEnabled?: boolean;
  language?: string;
  plan?: "free" | "bronze" | "silver" | "gold";
  tweetsUsedThisCycle?: number;
  planRenewsAt?: string;
  loginHistory?: LoginHistoryEntry[];
}

interface LoginResult {
  otpRequired?: boolean;
  message?: string;
  devOtp?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult | void>;
  submitLoginOtp: (email: string, code: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  updateProfile: (profileData: Partial<Omit<User, "_id" | "email" | "joinedDate">>) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Feature 6: run the app's device/browser-aware login rules (mobile time
// window, Chrome OTP requirement, login history) right after Firebase itself
// has confirmed the user's identity.
const runLoginCheck = async (email: string, code?: string) => {
  const deviceWidthHint = typeof window !== "undefined" ? window.innerWidth : undefined;
  const res = await axiosInstance.post("/auth/login-check", { email, code, deviceWidthHint });
  return res.data;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const unsubcribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseUser.email },
          });

          if (res.data) {
            setUser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          }
        } catch (err) {
          console.log("Failed to fetch user:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("twitter-user");
      }
      setIsLoading(false);
    });
    return () => unsubcribe();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult | void> => {
    setIsLoading(true);
    const usercred = await signInWithEmailAndPassword(auth, email, password);
    const firebaseuser = usercred.user;

    const checkData = await runLoginCheck(firebaseuser.email as string);
    if (checkData?.otpRequired) {
      setIsLoading(false);
      return {
        otpRequired: true,
        message: checkData.message,
        devOtp: checkData.devOtp,
      };
    }

    const res = await axiosInstance.get("/loggedinuser", {
      params: { email: firebaseuser.email },
    });
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    setIsLoading(false);
  };

  // Second step of login when the backend required a Chrome-login OTP.
  const submitLoginOtp = async (email: string, code: string) => {
    setIsLoading(true);
    await runLoginCheck(email, code);
    const res = await axiosInstance.get("/loggedinuser", { params: { email } });
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    setIsLoading(false);
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    setIsLoading(true);
    const usercred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = usercred.user;
    const newuser: any = {
      username,
      displayName,
      avatar: user.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
      email: user.email,
    };
    const res = await axiosInstance.post("/register", newuser);
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setUser(null);
    await signOut(auth);
    localStorage.removeItem("twitter-user");
  };

  const updateProfile = async (
    profileData: Partial<Omit<User, "_id" | "email" | "joinedDate">>
  ) => {
    if (!user) return;

    setIsLoading(true);
    const updatedUser: User = {
      ...user,
      ...profileData,
    };
    const res = await axiosInstance.patch(
      `/userupdate/${user.email}`,
      updatedUser
    );
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }

    setIsLoading(false);
  };

  // Re-fetches the current user from the backend (e.g. after a subscription
  // purchase or a language switch changes fields we don't set locally).
  const refreshUser = async () => {
    if (!user) return;
    const res = await axiosInstance.get("/loggedinuser", { params: { email: user.email } });
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
  };

  const googlesignin = async () => {
    setIsLoading(true);

    try {
      const googleauthprovider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleauthprovider);
      const firebaseuser = result.user;

      if (!firebaseuser?.email) {
        throw new Error("No email found in Google account");
      }

      let userData;

      try {
        const res = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseuser.email },
        });
        userData = res.data;
      } catch (err: any) {
        const newuser: any = {
          username: firebaseuser.email.split("@")[0],
          displayName: firebaseuser.displayName || "User",
          avatar: firebaseuser.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
          email: firebaseuser.email,
        };

        const registerRes = await axiosInstance.post("/register", newuser);
        userData = registerRes.data;
      }

      // Feature 6: same device/browser login rules apply to Google sign-in.
      const checkData = await runLoginCheck(firebaseuser.email);
      if (checkData?.otpRequired) {
        const promptMsg =
          checkData.message + (checkData.devOtp ? ` (dev code: ${checkData.devOtp})` : "");
        const code = typeof window !== "undefined" ? window.prompt(promptMsg) : null;
        if (!code) {
          setIsLoading(false);
          return;
        }
        await runLoginCheck(firebaseuser.email, code);
      }

      if (userData) {
        setUser(userData);
        localStorage.setItem("twitter-user", JSON.stringify(userData));
      } else {
        throw new Error("Login/Register failed: No user data returned");
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      alert(error.response?.data?.error || error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        submitLoginOtp,
        signup,
        updateProfile,
        refreshUser,
        logout,
        isLoading,
        googlesignin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
