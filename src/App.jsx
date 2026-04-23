import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import Register from './Register';
import Login from './Login';
import EmployerDashboard from './EmployerDashboard';
import FreelancerDashboard from './FreelancerDashboard';
import ChatPage from './Chatpage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (uid, retryCount = 0) => {
    try {
      // 1. LocalStorage dan tekshirish
      const cachedRole = localStorage.getItem(`role_${uid}`);
      if (cachedRole) {
        setRole(cachedRole);
        setLoading(false);
        return true;
      }

      // 2. Firestore dan tekshirish
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        if (userRole) {
          setRole(userRole);
          localStorage.setItem(`role_${uid}`, userRole);
          setLoading(false);
          return true;
        }
      }

      // 3. Agar topilmasa va retry imkoniyati bo'lsa (ro'yxatdan o'tayotgan bo'lishi mumkin)
      if (retryCount < 5) {
        setTimeout(() => fetchRole(uid, retryCount + 1), 1000);
      } else {
        setLoading(false);
      }
      return false;
    } catch (error) {
      console.error("Role olishda xato:", error);
      setLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchRole(currentUser.uid);
      } else {
        if (user) localStorage.removeItem(`role_${user.uid}`);
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchRole, user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-lg animate-pulse tracking-widest uppercase">Yuklanmoqda...</p>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          !user ? <Login /> :
          role === 'employer' ? <Navigate to="/employer" /> :
          role === 'freelancer' ? <Navigate to="/freelancer" /> :
          <div className="bg-dark-bg min-h-screen"></div> // Wait for role
        } />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

        <Route path="/employer" element={
          user && role === 'employer' ? <EmployerDashboard /> : <Navigate to="/login" />
        } />
        <Route path="/freelancer" element={
          user && role === 'freelancer' ? <FreelancerDashboard /> : <Navigate to="/login" />
        } />
        <Route path="/chat" element={
          user ? <ChatPage /> : <Navigate to="/login" />
        } />

        <Route path="/" element={
          !user ? <Navigate to="/login" /> :
          role === 'employer' ? <Navigate to="/employer" /> :
          role === 'freelancer' ? <Navigate to="/freelancer" /> :
          <div className="bg-dark-bg min-h-screen"></div> // Loading role
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;