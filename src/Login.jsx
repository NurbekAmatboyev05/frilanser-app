import React, { useState } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import 'animate.css';
import { useLanguage } from './LanguageContext';
import translations from './translations';
import LangSwitcher from './LangSwitcher';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = translations[lang];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const user = res.user;

      // Rolni Firestore dan darhol olish va keshga saqlash
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        localStorage.setItem(`role_${user.uid}`, userRole);
      }

      Swal.fire({
        title: t.welcome,
        text: t.loginSuccess,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#1e1b4b',
        color: '#fff'
      });

    } catch (err) {
      let errorMessage = t.errLogin;
      if (err.code === 'auth/user-not-found') errorMessage = t.errNotFound;
      if (err.code === 'auth/wrong-password') errorMessage = t.errWrongPass;
      if (err.code === 'auth/too-many-requests') errorMessage = t.errTooMany;
      if (err.code === 'auth/network-request-failed') errorMessage = t.errNetwork;

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
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>

      <form 
        onSubmit={handleLogin} 
        className="w-full max-w-md p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-6 relative z-10"
      >
        <div className="flex justify-end">
          <LangSwitcher variant="dark" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-tight">{t.loginTitle}</h2>
          <p className="text-gray-400 text-sm">{t.loginSubtitle}</p>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 block ml-1">{t.email}</label>
          <input 
            type="email"
            value={email}
            placeholder="example@mail.com" 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 block ml-1">{t.password}</label>
          <input 
            type="password"
            value={password}
            placeholder="••••••••" 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold shadow-lg shadow-primary/20 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.loginLoading : t.loginBtn}
        </button>

        <p className="text-center text-sm text-gray-400">
          {t.noAccount} <Link to="/register" className="text-primary hover:underline font-medium ml-1">{t.register}</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;