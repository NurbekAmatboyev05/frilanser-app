import { db } from '../firebase';
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp
} from 'firebase/firestore';

/**
 * Tranzaksiya yozuvini saqlash
 */
export const saveTransaction = async ({ fromUid, fromEmail, fromName, toUid, toEmail, toName, amount, jobId, applicationId, jobTitle }) => {
  await addDoc(collection(db, 'transactions'), {
    type:          'payment',
    fromUid,
    fromEmail,
    fromName,
    toUid,
    toEmail,
    toName,
    amount,
    jobId,
    applicationId,
    jobTitle,
    status:        'completed',
    createdAt:     serverTimestamp(),
  });
};

/**
 * Foydalanuvchining tranzaksiyalarini real-time tinglash
 * (ham yuboruvchi, ham qabul qiluvchi sifatida)
 */
export const subscribeToTransactions = (uid, callback) => {
  const q = query(
    collection(db, 'transactions'),
    where('fromUid', '==', uid)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(data);
  });
};

export const subscribeToEarnings = (uid, callback) => {
  const q = query(
    collection(db, 'transactions'),
    where('toUid', '==', uid)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(data);
  });
};
