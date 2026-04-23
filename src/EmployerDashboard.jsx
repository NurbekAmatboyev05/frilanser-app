import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, addDoc, query, where, onSnapshot, 
  serverTimestamp, doc, updateDoc, getDoc, orderBy
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useLanguage } from './LanguageContext';
import translations from './translations';
import LangSwitcher from './LangSwitcher';
import ThemeToggle from './ThemeToggle';

// NEW IMPORTS
import PaymentModal from './components/PaymentModal';
import BalanceCard from './components/BalanceCard';
import ReviewModal from './components/ReviewModal';
import { processJobPayment, getUserBalance } from './services/paymentService';
import { subscribeToTransactions } from './repositories/transactionRepository';
import { submitEmployerReview } from './services/reviewService';

const EmployerDashboard = () => {
  const [activeTab, setActiveTab] = useState('post');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [myJobs, setMyJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // PAYMENT MODAL STATES
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [userBalance, setUserBalance] = useState(0);

  // REVIEW MODAL STATES
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [appToReview, setAppToReview] = useState(null);

  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = translations[lang];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Employer o'zi e'lon qilgan ishlar
    const qJobs = query(
      collection(db, "jobs"),
      where("employerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      setMyJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Unga kelgan barcha arizalar
    const qApps = query(
      collection(db, "applications"),
      where("employerId", "==", user.uid)
    );
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      apps.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setApplications(apps);
    });

    // 3. To'lovlar tarixi
    const unsubTx = subscribeToTransactions(user.uid, (data) => {
      setTransactions(data);
    });

    return () => {
      unsubJobs();
      unsubApps();
      unsubTx();
    };
  }, []);

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title || !description || !budget) return;
    setLoading(true);

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "jobs"), {
        title,
        description,
        budget: Number(budget),
        employerId: user.uid,
        employerEmail: user.email,
        employerName: user.displayName || user.email.split('@')[0],
        status: "open",
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setDescription('');
      setBudget('');
      Swal.fire({
        title: t.postSuccess,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#111827',
        color: '#fff'
      });
      setActiveTab('my-jobs');
    } catch (err) {
      Swal.fire(t.error, err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (appId, newStatus) => {
    try {
      await updateDoc(doc(db, "applications", appId), { status: newStatus });
      Swal.fire({
        title: t.statusUpdated,
        icon: 'success',
        timer: 1000,
        showConfirmButton: false,
        background: '#111827',
        color: '#fff'
      });
    } catch (err) {
      Swal.fire(t.error, err.message, 'error');
    }
  };

  // PAYMENT LOGIC
  const openPayment = async (app) => {
    const job = myJobs.find(j => j.id === app.jobId);
    if (!job) return;

    const balance = await getUserBalance(auth.currentUser.uid);
    setUserBalance(balance);
    setSelectedApp(app);
    setSelectedJob(job);
    setShowPayModal(true);
  };

  const handlePayConfirm = async () => {
    try {
      await processJobPayment({
        employerId: auth.currentUser.uid,
        employerEmail: auth.currentUser.email,
        employerName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        freelancerId: selectedApp.freelancerId,
        freelancerEmail: selectedApp.freelancerEmail,
        freelancerName: selectedApp.freelancerName || selectedApp.freelancerEmail.split('@')[0],
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        applicationId: selectedApp.id,
        amount: selectedJob.budget
      });

      setShowPayModal(false);
      Swal.fire({
        title: t.paidSuccess,
        icon: 'success',
        background: '#111827',
        color: '#fff'
      });

      // To'lovdan keyin darhol baholash modalini ochish
      setAppToReview(selectedApp);
      setShowReviewModal(true);

    } catch (err) {
      Swal.fire(t.error, err.message, 'error');
    }
  };

  // REVIEW LOGIC
  const handleReviewSubmit = async ({ rating, comment }) => {
    try {
      await submitEmployerReview({
        fromUid: auth.currentUser.uid,
        toUid: appToReview.freelancerId,
        applicationId: appToReview.id,
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

  const startChat = async (otherUserEmail, otherUserId, otherUserName) => {
    try {
      const user = auth.currentUser;
      const chatId = [user.uid, otherUserId].sort().join("_");
      await updateDoc(doc(db, "chats", chatId), {
        id: chatId,
        participants: [user.uid, otherUserId],
        participantEmails: [user.email, otherUserEmail],
        participantNames: {
          [user.uid]: user.displayName || user.email.split('@')[0],
          [otherUserId]: otherUserName || otherUserEmail.split('@')[0]
        },
        lastUpdate: serverTimestamp(),
        isBlocked: false,
      }, { merge: true });
      navigate('/chat', { state: { chatId } });
    } catch (err) {
      // Chat yo'q bo'lsa yaratish
      const user = auth.currentUser;
      const chatId = [user.uid, otherUserId].sort().join("_");
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, "chats", chatId), {
        id: chatId,
        participants: [user.uid, otherUserId],
        participantEmails: [user.email, otherUserEmail],
        participantNames: {
          [user.uid]: user.displayName || user.email.split('@')[0],
          [otherUserId]: otherUserName || otherUserEmail.split('@')[0]
        },
        lastUpdate: serverTimestamp(),
        isBlocked: false,
      });
      navigate('/chat', { state: { chatId } });
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

  const pendingAppsCount = applications.filter(a => !a.status || a.status === 'pending').length;

  return (
    <div className="min-h-screen flex bg-transparent relative overflow-hidden transition-colors duration-300">
      {/* Background Decorations - only visible in dark mode via CSS or conditional */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse pointer-events-none opacity-0 dark:opacity-100"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none opacity-0 dark:opacity-100" style={{animationDelay: '2s'}}></div>

      {/* Sidebar */}
      <aside className="w-72 sidebar-bg hidden md:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-8">
          <h2 className="text-3xl font-black text-primary tracking-tighter">Employer<span className="text-slate-900 dark:text-white">Hub</span></h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-3 mt-4">
          <button 
            onClick={() => setActiveTab('post')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'post' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-200 hover:bg-white/10'}`}
          >
            <span className="mr-3 text-2xl">📝</span> {t.employerTab_post}
          </button>
          
          <button 
            onClick={() => setActiveTab('apps')}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'apps' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-200 hover:bg-white/10'}`}
          >
            <div className="flex items-center">
              <span className="mr-3 text-2xl">📩</span> {t.employerTab_apps}
            </div>
            {pendingAppsCount > 0 && (
              <span className="bg-white text-primary text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">{pendingAppsCount}</span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('my-jobs')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'my-jobs' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-200 hover:bg-white/10'}`}
          >
            <span className="mr-3 text-2xl">💼</span> {t.employerTab_jobs}
          </button>
          
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${activeTab === 'transactions' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-200 hover:bg-white/10'}`}
          >
            <span className="mr-3 text-2xl">💳</span> {t.employerTab_transactions}
          </button>
          
          <button 
            onClick={() => navigate('/chat')}
            className="w-full flex items-center px-4 py-3.5 text-sm font-bold text-gray-200 hover:bg-white/10 rounded-2xl transition-all"
          >
            <span className="mr-3 text-2xl">💬</span> {t.freelancerTab_chat}
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <span className="mr-3 text-xl">🚪</span> {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Navbar */}
        <header className="h-16 header-bg flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="md:hidden font-bold text-xl text-primary tracking-tighter">EmployerHub</div>
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
          {activeTab === 'post' && (
            <div className="max-w-2xl mx-auto glass-card p-8 rounded-3xl space-y-6 animate__animated animate__fadeIn">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t.employerTab_post}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Yangi ish e'lonini yarating va mutaxassislarni toping</p>
              </div>
              <form onSubmit={handlePostJob} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 ml-1">{t.jobTitle}</label>
                  <input 
                    type="text" 
                    placeholder={t.jobTitle} 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 ml-1">{t.jobDesc}</label>
                  <textarea 
                    placeholder={t.jobDesc} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full min-h-[120px] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 ml-1">{t.budget} ($)</label>
                  <input 
                    type="number" 
                    placeholder="500" 
                    value={budget} 
                    onChange={(e) => setBudget(e.target.value)} 
                    className="w-full"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 mt-4"
                >
                  {loading ? '...' : t.postBtn}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate__animated animate__fadeIn">
              {applications.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4">
                  <span className="text-6xl block text-white/20">📭</span>
                  <p className="text-gray-400 font-medium">{t.noApps}</p>
                </div>
              ) : (
                applications.map(app => (
                  <div key={app.id} className="glass-card p-6 rounded-3xl hover:bg-white/10 transition-all flex flex-col group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {app.freelancerName?.[0] || 'F'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white leading-none">{app.freelancerName}</h4>
                          <span className="text-[10px] text-gray-400">{app.freelancerEmail}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                        app.status === 'accepted' ? 'bg-blue-500/20 text-blue-400' :
                        app.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        app.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {app.status || 'pending'}
                      </span>
                    </div>

                    <div className="mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                       <p className="text-xs text-gray-400 mb-1">Loyiha:</p>
                       <p className="text-sm font-bold text-white">{app.jobTitle}</p>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      {(!app.status || app.status === 'pending') && (
                        <>
                          <button 
                            onClick={() => handleStatus(app.id, 'accepted')}
                            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all"
                          >
                            {t.accept}
                          </button>
                          <button 
                            onClick={() => handleStatus(app.id, 'rejected')}
                            className="flex-1 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold rounded-lg transition-all"
                          >
                            {t.reject}
                          </button>
                        </>
                      )}
                      {app.status === 'accepted' && (
                        <button 
                          onClick={() => openPayment(app)}
                          className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold rounded-lg transition-all"
                        >
                          💸 {t.payNow}
                        </button>
                      )}
                      <button 
                        onClick={() => startChat(app.freelancerEmail, app.freelancerId, app.freelancerName)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all"
                        title={t.chatBtn}
                      >
                        💬
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'my-jobs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate__animated animate__fadeIn">
              {myJobs.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4">
                  <span className="text-6xl block text-white/20">💼</span>
                  <p className="text-gray-400 font-medium">{t.noJobs}</p>
                </div>
              ) : (
                myJobs.map(job => (
                  <div key={job.id} className="glass-card p-6 rounded-3xl hover:bg-white/10 transition-all flex flex-col group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                       <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">OPEN</span>
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-white group-hover:text-primary transition-colors">{job.title}</h4>
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-3 mb-6 flex-1">{job.description}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <span className="text-xl font-black text-primary">${job.budget}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        {job.createdAt?.toDate ? new Date(job.createdAt.toDate()).toLocaleDateString() : 'Yaqinda'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="max-w-4xl mx-auto space-y-6 animate__animated animate__fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 rounded-3xl text-center border-l-4 border-primary">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{lang === 'uz' ? 'Jami to\'langan' : 'Всего выплачено'}</p>
                  <p className="text-3xl font-black text-primary">
                    ${transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)}
                  </p>
                </div>
                <div className="glass-card p-6 rounded-3xl text-center border-l-4 border-blue-500">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{lang === 'uz' ? 'Loyihalar' : 'Проекты'}</p>
                  <p className="text-3xl font-black text-blue-400">{transactions.length}</p>
                </div>
                <div className="glass-card p-6 rounded-3xl text-center border-l-4 border-purple-500">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{lang === 'uz' ? 'Oxirgi to\'lov' : 'Последняя оплата'}</p>
                  <p className="text-3xl font-black text-purple-400">${transactions[0]?.amount || 0}</p>
                </div>
              </div>

              <div className="glass-card rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                   <h3 className="font-bold text-white">{t.employerTab_transactions}</h3>
                </div>
                
                {transactions.length === 0 ? (
                  <div className="py-20 text-center text-gray-500">{t.noEarnings}</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {transactions.map(tx => (
                      <div key={tx.id} className="p-6 flex justify-between items-center hover:bg-white/5 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 text-xl font-bold">
                            -
                          </div>
                          <div>
                            <strong className="block text-white font-bold">{tx.jobTitle}</strong>
                            <span className="text-xs text-gray-500">{t.toFreelancer}: {tx.toName || tx.toEmail}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <strong className="block text-xl font-black text-red-400">-${tx.amount}</strong>
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

      {/* MODALS */}
      {showPayModal && (
        <PaymentModal 
          job={selectedJob}
          application={selectedApp}
          balance={userBalance}
          onConfirm={handlePayConfirm}
          onCancel={() => setShowPayModal(false)}
        />
      )}

      {showReviewModal && appToReview && (
        <ReviewModal 
          targetEmail={appToReview.freelancerName || appToReview.freelancerEmail}
          isEmployerReviewing={true}
          onSubmit={handleReviewSubmit}
          onSkip={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};

export default EmployerDashboard;