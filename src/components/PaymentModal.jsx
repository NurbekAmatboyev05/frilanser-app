import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

const t = {
  uz: {
    title: "To'lovni tasdiqlash",
    job: "Ish",
    freelancer: "Frilanser",
    amount: "To'lov miqdori",
    yourBalance: "Sizning balansingiz",
    afterPay: "To'lovdan keyin",
    insufficient: "Balans yetarli emas!",
    topUpHint: "Avval balansingizni to'ldiring.",
    cancel: "Bekor qilish",
    confirm: "To'lash",
    processing: "To'lanmoqda...",
    warning: "Bu amalni bekor qilib bo'lmaydi!",
  },
  ru: {
    title: "Подтверждение оплаты",
    job: "Работа",
    freelancer: "Фрилансер",
    amount: "Сумма оплаты",
    yourBalance: "Ваш баланс",
    afterPay: "После оплаты",
    insufficient: "Недостаточно средств!",
    topUpHint: "Сначала пополните баланс.",
    cancel: "Отмена",
    confirm: "Оплатить",
    processing: "Оплата...",
    warning: "Это действие нельзя отменить!",
  },
};

const PaymentModal = ({ job, application, balance, onConfirm, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const { lang } = useLanguage();
  const tr = t[lang];

  const amount = job?.budget || 0;
  const afterBalance = balance - amount;
  const insufficient = balance < amount;

  const handleConfirm = async () => {
    if (insufficient || loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate__animated animate__fadeIn" onClick={onCancel}>
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate__animated animate__zoomIn animate__faster" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/5">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-2xl">💳</div>
          <div>
            <h3 className="text-xl font-bold text-white">{tr.title}</h3>
            <p className="text-xs text-gray-400 font-medium">Xavfsiz tranzaksiya tizimi</p>
          </div>
        </div>

        <div className="p-8 space-y-5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 font-medium">{tr.job}</span>
            <span className="text-white font-bold">{job?.title}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 font-medium">{tr.freelancer}</span>
            <span className="text-white font-bold">{application?.freelancerName || application?.freelancerEmail}</span>
          </div>
          
          <div className="pt-2 pb-1">
             <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
               <span className="text-sm font-bold text-gray-300">{tr.amount}</span>
               <span className="text-2xl font-black text-primary">${amount}</span>
             </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">{tr.yourBalance}</span>
              <span className="text-gray-300 font-bold">${balance}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">{tr.afterPay}</span>
              <span className={`font-black ${afterBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                ${afterBalance}
              </span>
            </div>
          </div>

          {insufficient && (
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <p className="text-xs text-red-400 font-medium leading-relaxed">
                {tr.insufficient} <br/> {tr.topUpHint}
              </p>
            </div>
          )}

          {!insufficient && (
            <p className="text-[10px] text-center text-gray-500 font-medium italic">
              * {tr.warning}
            </p>
          )}
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 grid grid-cols-2 gap-3">
          <button 
            onClick={onCancel} 
            disabled={loading}
            className="py-3.5 rounded-2xl border border-white/10 text-sm font-bold text-gray-400 hover:bg-white/5 transition-all active:scale-95 disabled:opacity-50"
          >
            {tr.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || insufficient}
            className="py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? tr.processing : tr.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
