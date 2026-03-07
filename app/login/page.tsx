"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase/config";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getFriendlyErrorMessage = (firebaseError: any) => {
    const code = firebaseError.code || "";
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password. Please try again.";
      case "auth/weak-password":
        return "Your password is too weak. Please use at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Fetch custom signup balance
        let startBalance = 10;
        try {
          const settingsDoc = await getDoc(doc(db, "system", "settings"));
          if (settingsDoc.exists()) {
            startBalance = settingsDoc.data().signupBalance || 10;
          }
        } catch (settingsErr) {
          console.error("Error fetching signup settings:", settingsErr);
        }

        // Create user document in Firestore with starting balance
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          balance: startBalance
        });
      }
      
      const idTokenResult = await userCredential.user.getIdTokenResult();
      if (idTokenResult.claims.admin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/"); // Redirect to the receipt generator
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      
      // Check if user document exists, if not create it with starting balance
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // Fetch custom signup balance
        let startBalance = 10;
        try {
          const settingsDoc = await getDoc(doc(db, "system", "settings"));
          if (settingsDoc.exists()) {
            startBalance = settingsDoc.data().signupBalance || 10;
          }
        } catch (settingsErr) {
          console.error("Error fetching signup settings for Google user:", settingsErr);
        }

        await setDoc(userRef, {
          uid: userCredential.user.uid,
          balance: startBalance
        });
      }

      const idTokenResult = await userCredential.user.getIdTokenResult();
      if (idTokenResult.claims.admin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/"); // Redirect to the receipt generator
      }
    } catch (err: any) {
      setError(err.message || "An error occurred with Google Sign-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden font-sans border border-gray-100">
      <div className="bg-[#8cc63f] p-6 flex flex-col items-center justify-center border-b-[5px] border-[#7ab32f]">
        <div className="bg-white rounded-full p-2 mb-3 shadow-md">
          <img src="/cbe-logo.png" alt="CBE Logo" className="w-12 h-12 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-wide">
          Receipt System
        </h2>
        <p className="text-white/80 text-sm mt-1 font-medium">Authentication Required</p>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-bold text-[#1e293b] mb-6 text-center">
          {isLogin ? "Sign In to Continue" : "Create an Account"}
        </h3>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8cc63f] focus:border-[#8cc63f] outline-none text-black transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8cc63f] focus:border-[#8cc63f] outline-none text-black transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#cc9b52] hover:bg-[#b88c4a] text-white font-bold py-3 rounded-lg transition duration-200 mt-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-[#fff1f2] text-[#e11d48] p-3 rounded-lg text-sm border border-[#fecdd3] text-center font-medium shadow-sm">
            {error}
          </div>
        )}

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-3 rounded-lg transition duration-200 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>

        <p className="mt-8 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#8cc63f] font-bold hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
