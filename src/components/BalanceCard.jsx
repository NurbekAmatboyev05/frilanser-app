import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { getUserBalance, addFunds } from '../services/paymentService';
import { auth } from '../firebase';
import Swal from 'sweetalert2';

const t = {
  uz: {
    balance: "Balans",
    topUp: "To'ldirish",
    topUpTitle: "Balansni to'ldirish (Demo)",
    amountLabel: "Summa ($)",
    cancel: "Bekor qilish",
    confirm: "To'ldirish",
    success: "Muvaffaqiyatli!",
    successMsg: "Balans to'ldirildi",
  },
  ru: {
    balance: "Баланс",
    topUp: "Пополнить",
    topUpTitle: "Пополнение баланса (Demo)",
    amountLabel: "Сумма ($)",
    cancel: "Отмена",
    confirm: "Пополнить",
    success: "Успешно!",
    successMsg: "Баланс пополнен",
  }
};

const BalanceCard = () => {
  const [balance, setBalance] = useState(0);
  const { lang } = useLanguage();
  const tr = t[lang];
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const fetchBalance = async () => {
        const b = await getUserBalance(user.uid);
        setBalance(b);
      };
      fetchBalance();
    }
  }, [user]);

  const handleTopUp = async () => {
    const { value: amount } = await Swal.fire({
      title: tr.topUpTitle,
      input: 'number',
      inputLabel: tr.amountLabel,
      inputPlaceholder: '100',
      showCancelButton: true,
      confirmButtonText: tr.confirm,
      cancelButtonText: tr.cancel,
      confirmButtonColor: '#14a800',
      background: '#111827',
      color: '#fff',
      inputValidator: (value) => {
        if (!value || value <= 0) {
          return 'Musbat son kiriting!';
        }
      }
    });

    if (amount) {
      try {
        await addFunds(user.uid, Number(amount));
        const newBalance = await getUserBalance(user.uid);
        setBalance(newBalance);
        
        Swal.fire({
          title: tr.success,
          text: tr.successMsg,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#111827',
          color: '#fff'
        });
      } catch (err) {
        Swal.fire({
          title: 'Xato',
          text: err.message,
          icon: 'error',
          background: '#111827',
          color: '#fff'
        });
      }
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{tr.balance}:</span>
        <span className="text-lg font-black text-primary tracking-tight">${balance}</span>
      </div>
      <button 
        onClick={handleTopUp}
        className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-hover text-white rounded-full transition-all shadow-lg active:scale-90"
        title={tr.topUp}
      >
        ➕
      </button>
    </div>
  );
};

export default BalanceCard;
