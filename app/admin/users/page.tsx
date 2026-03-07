"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface UserData {
  id: string;
  email: string;
  balance: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const fetchUsersData = async () => {
      try {
        // Get balance data from Firestore
        const usersSnap = await getDocs(collection(db, "users"));
        const firestoreUsers = usersSnap.docs.map(d => ({
          id: d.id,
          balance: d.data().balance || 0,
          email: "",
        }));

        // Get emails from Firebase Auth via the API route
        const response = await fetch("/api/admin/users");
        if (response.ok) {
          const emailMap: Record<string, string> = await response.json();
          const combined = firestoreUsers.map(u => ({
            ...u,
            email: emailMap[u.id] || "—",
          }));
          setUsers(combined);
        } else {
          setUsers(firestoreUsers);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsersData();
  }, []);

  const handleForceLogout = async (userId: string) => {
    setLoggingOut(userId);
    try {
      // Setting this flag causes the user's app to detect it and sign them out
      await updateDoc(doc(db, "users", userId), { forceLogout: true });
    } catch (err) {
      console.error("Force logout failed:", err);
    } finally {
      setLoggingOut(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">User Management</h1>
        <p className="text-gray-400 font-bold text-sm">Monitor users and control their session access.</p>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#8cc63f] focus:ring-4 focus:ring-[#8cc63f]/10 transition-all shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/20">
                <th className="px-8 py-5 text-[10px] uppercase font-black text-gray-400 tracking-widest pl-10">User Email</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-gray-400 tracking-widest text-right">Balance (ETB)</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-gray-400 tracking-widest text-right pr-10">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-8 py-5 pl-10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-black text-gray-400 group-hover:bg-[#8cc63f]/20 group-hover:text-[#8cc63f] transition-all shrink-0">
                        {user.email?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-sm font-bold text-gray-700">{user.email || "No Email"}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="inline-flex items-center px-4 py-1.5 bg-[#8cc63f]/5 border border-[#8cc63f]/10 rounded-xl text-sm font-black text-[#8cc63f]">
                      {user.balance?.toFixed(2) || "0.00"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right pr-10">
                    <button
                      onClick={() => handleForceLogout(user.id)}
                      disabled={loggingOut === user.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-black rounded-xl border border-red-100 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wider"
                    >
                      {loggingOut === user.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                      Force Logout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-20 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
              {search ? `No users matching "${search}"` : "No users found in the system."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
