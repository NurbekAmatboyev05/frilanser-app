import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import 'animate.css';
import { useLanguage } from './LanguageContext';
import translations from './translations';
import LangSwitcher from './LangSwitcher';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('freelancer');
  const [loading, setLoading] = useState(false);
  const { lang } = useLanguage();
  const t = translations[lang];

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const user = res.user;

      await updateProfile(user, { displayName: name });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem(`role_${user.uid}`, role);

      Swal.fire({
        title: t.success,
        text: t.registerSuccess,
        icon: 'success',
        background: '#1e1b4b',
        color: '#fff',
        confirmButtonColor: '#6366f1',
        showConfirmButton: false,
        timer: 2000,
        showConfirmButton: false
      });

    } catch (err) {
      let errorMessage = err.message;
      if (err.code === 'auth/email-already-in-use') errorMessage = t.errEmailUsed;
      if (err.code === 'auth/weak-password') errorMessage = t.errWeakPass;
      if (err.code === 'auth/invalid-email') errorMessage = t.errInvalidEmail;

      Swal.fire({
        icon: 'error',
        title: t.error,
        text: errorMessage,
        background: '#1e1b4b',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 animate__animated animate__fadeIn relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1.5s'}}></div>

      <form 
        onSubmit={handleRegister} 
        className="w-full max-w-md p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-5 relative z-10"
      >
        <div className="flex justify-end">
          <LangSwitcher variant="dark" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold text-white tracking-tight animate__animated animate__pulse animate__infinite">
            {t.registerTitle}
          </h2>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300 block ml-1">{t.nameLabel}</label>
          <input 
            type="text" 
            placeholder="Ali Valiyev" 
            value={name}
            onChange={(e) => setName(e.target.value)} 
            required 
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300 block ml-1">{t.email}</label>
          <input 
            type="email" 
            placeholder="example@mail.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300 block ml-1">{t.password}</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300 block ml-1">{t.roleLabel}</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer"
          >
            <option value="freelancer" className="bg-dark-bg">{t.freelancerRole}</option>
            <option value="employer" className="bg-dark-bg">{t.employerRole}</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold shadow-lg shadow-primary/20 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? t.registerLoading : t.continueBtn}
        </button>

        <p className="text-center text-sm text-gray-400 pt-2">
          {t.hasAccount} <Link to="/login" className="text-primary hover:underline font-medium ml-1">{t.loginLink}</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;