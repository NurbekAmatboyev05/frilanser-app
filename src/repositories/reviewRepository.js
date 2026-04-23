import { db } from '../firebase';
import {
  collection, addDoc, query, where,
  orderBy, onSnapshot, serverTimestamp, getDocs
} from 'firebase/firestore';

/**
 * Review saqlash
 */
export const saveReview = async ({ fromUid, toUid, applicationId, rating, comment, type }) => {
  await addDoc(collection(db, 'reviews'), {
    fromUid,
    toUid,
    applicationId,
    rating,
    comment,
    type,   // 'employer_to_freelancer' | 'freelancer_to_employer'
    createdAt: serverTimestamp(),
  });
};

/**
 * Foydalanuvchiga yozilgan reviewlarni real-time tinglash
 */
export const subscribeToReviews = (toUid, callback) => {
  const q = query(
    collection(db, 'reviews'),
    where('toUid', '==', toUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

/**
 * Foydalanuvchining o'rtacha reytingini hisoblash
 */
export const getAverageRating = async (toUid) => {
  const q = query(collection(db, 'reviews'), where('toUid', '==', toUid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const total = snap.docs.reduce((sum, d) => sum + (d.data().rating || 0), 0);
  return (total / snap.docs.length).toFixed(1);
};

/**
 * Muayyan ariza uchun review allaqachon bormi?
 */
export const hasReviewed = async (fromUid, applicationId) => {
  const q = query(
    collection(db, 'reviews'),
    where('fromUid', '==', fromUid),
    where('applicationId', '==', applicationId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
};
