import React, { useState, useEffect } from 'react';
import { db, storage, auth } from './firebase';
import { 
  doc, updateDoc, getDoc, collection, query, where,
  orderBy, onSnapshot, addDoc, serverTimestamp, setDoc 
} from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useLanguage } from './LanguageContext';
import translations from './translations';
import LangSwitcher from './LangSwitcher';
import ThemeToggle from './ThemeToggle';

// NEW IMPORTS
import BalanceCard from './components/BalanceCard';
import ReviewModal from './components/ReviewModal';
import { submitFreelancerReview } from './services/reviewService';
import { subscribeToEarnings } from './repositories/transactionRepository';

const FreelancerDashboard = () => {
  const [activeTab, setActiveTab] = useState('jobs');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]); // To'liq ma'lumotlar
  const [earnings, setEarnings] = useState([]);
  const [unreadChats, setUnreadChats] = useState(0);
  
  // MODAL STATES
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = translations[lang];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubJobs = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Ishlar xatosi:", error));

    const qApplied = query(
      collection(db, "applications"),
      where("freelancerId", "==", user.uid)
    );
    const unsubApplied = onSnapshot(qApplied, (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      apps.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setMyApplications(apps);
      setAppliedJobs(apps.map(a => a.jobId));
    });

    const qChats = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.lastSenderId && 
            data.lastSenderId !== user.uid && 
            !data[`read_${user.uid}`]) {
          count++;
        }
      });
      setUnreadChats(count);
    });

    const unsubEarnings = subscribeToEarnings(user.uid, (data) => {
      setEarnings(data);
    });

    return () => {
      unsubJobs();
      unsubApplied();
      unsubChats();
      unsubEarnings();
    };
  }, []);

  const startChat = async (otherUserEmail, otherUserId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const chatId = [user.uid, otherUserId].sort().join("_");
      await setDoc(doc(db, "chats", chatId), {
        id: chatId,
        participants: [user.uid, otherUserId],
        participantEmails: [user.email, otherUserEmail],
        participantNames: {
          [user.uid]: user.displayName || user.email.split('@')[0],
          [otherUserId]: otherUserEmail // Name passed in here
        },
        lastUpdate: serverTimestamp(),
        isBlocked: false,
      }, { merge: true });
      navigate('/chat', { state: { chatId } });
    } catch (err) {
      Swal.fire(t.error, t.chatStartError, 'error');
    }
  };

  const handleApply = async (job) => {
    const user = auth.currentUser;
    if (!user) return;

    if (appliedJobs.includes(job.id)) {
      Swal.fire({
        icon: 'info',
        title: t.alreadyApplied,
        background: '#111827',
        color: '#fff'
      });
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      const applicationId = `${user.uid}_${job.id}`; // Deterministik ID
      await setDoc(doc(db, "applications", applicationId), {
        id: applicationId,
        jobId: job.id,
        jobTitle: job.title,
        employerId: job.employerId,
        employerEmail: job.employerEmail,
        employerName: job.employerName || job.employerEmail.split('@')[0],
        freelancerId: user.uid,
        freelancerEmail: user.email,
        freelancerName: user.displayName || user.email.split('@')[0],
        freelancerCv: userData?.cvUrl || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Swal.fire({
        title: t.applySuccess,
        text: t.applySuccessMsg,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#111827',
        color: '#fff'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t.error,
        text: t.applyError,
        background: '#111827',
        color: '#fff'
      });
    }
  };

  const openReview = (app) => {
    setSelectedApp(app);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async ({ rating, comment }) => {
    try {
      await submitFreelancerReview({
        fromUid: auth.currentUser.uid,
        toUid: selectedApp.employerId,
        applicationId: selectedApp.id,
        rating,
        comment
      });
      setShowReviewModal(false);
      Swal.fire({
        title: t.success,
        text: t.saveSuccess,
        icon: 'success',
        background: '#111827',
        color: '#fff'
      });
    } catch (error) {
      Swal.fire(t.error, error.message, 'error');
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      let cvUrl = "";
      if (file) {
        const fileRef = ref(storage, `cvs/${user.uid}`);
        await uploadBytes(fileRef, file);
        cvUrl = await getDownloadURL(fileRef);
      }

      await updateDoc(doc(db, "users", user.uid), {
        skills: skills.split(',').map(s => s.trim()),
        bio,
        updatedAt: new Date().toISOString(),
        ...(cvUrl && { cvUrl })
      });

      Swal.fire({
        title: t.saveSuccess,
        text: t.saveSuccessMsg,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#111827',
        color: '#fff'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t.error,
        text: err.message,
        background: '#111827',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const res = await Swal.fire({
      title: t.logoutConfirm,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t.yes,
      cancelButtonText: t.no,
      background: '#111827',
      color: '#fff'
    });
    if (res.isConfirmed) {
      localStorage.removeItem(`role_${auth.currentUser?.uid}`);
      await auth.signOut();
    }
  };

  // STATISTICS CALCULATION
  const totalEarnings = earnings.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthEarnings = earnings.reduce((sum, tx) => {
    if (tx.createdAt?.toDate) {
      const d = tx.createdAt.toDate();
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + Number(tx.amount || 0);
      }
    }
    return sum;
  }, 0);

  const employerStats = earnings.reduce((acc, tx) => {
    const emailOrName = tx.fromName || tx.fromEmail || tx.fromUid;
    acc[emailOrName] = (acc[emailOrName] || 0) + Number(tx.amount || 0);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex bg-transparent relative overflow-hidden transition-colors duration-300">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse pointer-events-none opacity-0 dark:opacity-100"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none opacity-0 dark:opacity-100" style={{animationDelay: '1.5s'}}></div>

      {/* Sidebar */}
      <aside className="w-72 bg-white/70 dark:bg-white/5 backdrop-blur-xl dark:backdrop-blur-2xl border-r border-gray-200 dark:border-white/10 hidden md:flex flex-col sticky top-0 h-screen z-20 transition-all duration-300">
        <div className="p-8 text-center">
          <h2 className="text-3xl font-black text-primary tracking-tighter">Freelance<span className="text-slate-900 dark:text-white">PRO</span></h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-3 mt-4">
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'jobs' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10'}`}
          >
            <span className="mr-3 text-2xl">🔍</span> {t.freelancerTab_jobs}
          </button>
          
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10'}`}
          >
            <span className="mr-3 text-2xl">👤</span> {t.freelancerTab_profile}
          </button>
          
          <button 
            onClick={() => setActiveTab('my-apps')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'my-apps' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10'}`}
          >
            <span className="mr-3 text-2xl">📂</span> {lang === 'uz' ? 'Arizalarim' : 'Мои заявки'}
          </button>
          
          <button 
            onClick={() => setActiveTab('earnings')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'earnings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10'}`}
          >
            <span className="mr-3 text-2xl">💳</span> {t.freelancerTab_earnings}
          </button>
          
          <button 
            onClick={() => navigate('/chat')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl text-slate-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
          >
            <div className="flex items-center">
              <span className="mr-3 text-2xl">💬</span> {t.freelancerTab_chat}
            </div>
            {unreadChats > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-sm font-black">{unreadChats}</span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <span className="mr-3 text-xl">🚪</span> {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Navbar */}
        <header className="h-16 bg-white/40 dark:bg-white/5 backdrop-blur-md dark:backdrop-blur-xl border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 transition-all duration-300">
          <div className="md:hidden font-bold text-xl text-primary tracking-tighter">FreelancePRO</div>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-4">
            <BalanceCard />
            <ThemeToggle />
            <LangSwitcher />
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20">
              {auth.currentUser?.displayName?.[0] || auth.currentUser?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 overflow-y-auto">
          {activeTab === 'jobs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate__animated animate__fadeIn">
              {jobs.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4">
                  <span className="text-6xl block opacity-20">🔎</span>
                  <p className="text-gray-400 font-medium">{t.noJobsAvail}</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="bg-white/70 dark:bg-white/5 backdrop-blur-xl dark:backdrop-blur-2xl border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-2xl p-6 rounded-3xl hover:bg-white/80 dark:hover:bg-white/10 transition-all flex flex-col group animate__animated animate__fadeIn">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">{job.title}</h4>
                      <span className="text-primary font-bold bg-primary/20 border border-primary/20 px-3 py-1 rounded-full text-sm">${job.budget}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-6 flex-1">{job.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button 
                        onClick={() => handleApply(job)}
                        disabled={appliedJobs.includes(job.id)}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          appliedJobs.includes(job.id) 
                          ? 'bg-black/5 dark:bg-white/5 text-gray-500 cursor-not-allowed' 
                          : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
                        }`}
                      >
                        {appliedJobs.includes(job.id) ? t.appliedBtn : t.applyBtn}
                      </button>
                      <button 
                        onClick={() => startChat(job.employerName || job.employerEmail, job.employerId)}
                        className="py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-sm font-semibold hover:bg-white transition-all flex items-center justify-center text-slate-900 dark:text-white"
                      >
                         {t.chatBtn}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto bg-white/70 dark:bg-white/5 backdrop-blur-xl dark:backdrop-blur-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-2xl p-8 rounded-3xl space-y-8 animate__animated animate__fadeIn transition-all duration-300">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t.profileTitle}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">O'z ko'nikmalaringiz va tajribangizni oshiring</p>
              </div>
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-gray-300 ml-1">{t.skillsLabel}</label>
                  <input 
                    type="text" 
                    placeholder={t.skillsPlaceholder}
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-gray-300 ml-1">{t.bioLabel}</label>
                  <textarea 
                    placeholder={t.bioPlaceholder}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)} 
                    rows="4"
                    className="w-full min-h-[120px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-gray-300 ml-1">{t.cvLabel} (PDF)</label>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setFile(e.target.files[0])} 
                    className="w-full file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 mt-4"
                >
                  {loading ? '...' : t.saveBtn}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'my-apps' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate__animated animate__fadeIn">
              {myApplications.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4">
                  <span className="text-6xl block opacity-20">📂</span>
                  <p className="text-gray-400 font-medium">{t.noApps}</p>
                </div>
              ) : (
                myApplications.map(app => (
                  <div key={app.id} className="bg-white/70 dark:bg-white/5 backdrop-blur-xl dark:backdrop-blur-2xl border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-2xl p-6 rounded-3xl hover:bg-white/80 dark:hover:bg-white/10 transition-all relative overflow-hidden animate__animated animate__fadeIn">
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      app.status === 'accepted' ? 'bg-blue-500' :
                      app.status === 'paid' ? 'bg-green-500' :
                      app.status === 'dismissed' ? 'bg-gray-400' :
                      app.status === 'rejected' ? 'bg-red-500' : 'bg-orange-400'
                    }`}></div>
                    
                    <div className="flex justify-between items-start mb-4 pl-2">
                       <div>
                         <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{app.jobTitle}</h4>
                         <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-bold">{app.employerName}</p>
                       </div>
                       <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                         app.status === 'accepted' ? 'bg-blue-500/20 text-blue-500' :
                         app.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                         app.status === 'dismissed' ? 'bg-gray-500/20 text-gray-500' :
                         app.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                       }`}>
                         {app.status || 'pending'}
                       </span>
                    </div>

                    {app.status === 'paid' && !app.freelancerReviewed && (
                      <button 
                        onClick={() => openReview(app)}
                        className="w-full mt-4 py-2 bg-yellow-400/20 hover:bg-yellow-400 text-yellow-600 dark:text-yellow-400 hover:text-black text-xs font-bold rounded-lg border border-yellow-400/20 transition-all"
                      >
                        ⭐ {lang === 'uz' ? 'Fikr qoldirish' : 'Оставить отзыв'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="max-w-4xl mx-auto space-y-6 animate__animated animate__fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border-l-4 border-green-500 p-8 rounded-3xl text-center relative overflow-hidden group shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-6xl">💰</div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{lang === 'uz' ? 'Jami tushum' : 'Всего заработано'}</p>
                  <p className="text-4xl font-black text-green-500 dark:text-green-400">${totalEarnings}</p>
                </div>
                <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border-l-4 border-primary p-8 rounded-3xl text-center relative overflow-hidden group shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-6xl">📅</div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{lang === 'uz' ? 'Shu oyda' : 'В этом месяце'}</p>
                  <p className="text-4xl font-black text-primary">${thisMonthEarnings}</p>
                </div>
              </div>

              {Object.keys(employerStats).length > 0 && (
                <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-lg transition-all duration-300">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4">{lang === 'uz' ? 'Kimdan qancha qabul qilindi' : 'От кого сколько получено'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(employerStats).map(([email, amount]) => (
                      <div key={email} className="flex justify-between items-center p-4 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate mr-4">{email}</span>
                        <strong className="text-slate-900 dark:text-white font-bold">${amount}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl dark:backdrop-blur-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-2xl rounded-3xl overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                   <h3 className="font-bold text-slate-900 dark:text-white">{lang === 'uz' ? 'Oxirgi to\'lovlar tarixi' : 'История последних выплат'}</h3>
                </div>
                
                {earnings.length === 0 ? (
                  <div className="py-20 text-center text-gray-500">{t.noEarnings}</div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5">
                    {earnings.map(tx => (
                      <div key={tx.id} className="p-6 flex justify-between items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 text-xl font-bold">
                            +
                          </div>
                          <div>
                            <strong className="block text-slate-900 dark:text-white font-bold">{tx.jobTitle}</strong>
                            <span className="text-xs text-gray-500">{t.fromEmployer}: {tx.fromName || tx.fromEmail}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <strong className="block text-xl font-black text-green-500 dark:text-green-400">+${tx.amount}</strong>
                          <span className="text-[10px] text-gray-500 font-bold uppercase">
                             {tx.createdAt?.toDate ? new Date(tx.createdAt.toDate()).toLocaleDateString() : 'Yaqinda'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {showReviewModal && selectedApp && (
        <ReviewModal 
          targetEmail={selectedApp.employerName || selectedApp.employerEmail}
          isEmployerReviewing={false}
          onSubmit={handleReviewSubmit}
          onSkip={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};

export default FreelancerDashboard;