import { db } from '../firebase';
import {
  doc, getDoc, updateDoc, runTransaction, increment
} from 'firebase/firestore';

/**
 * Foydalanuvchi ma'lumotlarini olish
 */
export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('Foydalanuvchi topilmadi');
  return { uid: snap.id, ...snap.data() };
};

/**
 * Foydalanuvchi balansini olish
 */
export const getUserBalance = async (uid) => {
  const user = await getUser(uid);
  return user.balance ?? 0;
};

/**
 * Balansni to'ldirish (virtual hamyon — demo)
 */
export const topUpBalance = async (uid, amount) => {
  if (amount <= 0) throw new Error('Miqdor 0 dan katta bo\'lishi kerak');
  await updateDoc(doc(db, 'users', uid), {
    balance: increment(amount)
  });
};

/**
 * Atomic balans o'tkazma: employer → freelancer
 * runTransaction ishlatiladi — race condition dan himoya
 */
export const transferBalance = async ({ fromUid, toUid, amount }) => {
  if (amount <= 0) throw new Error('Miqdor musbat bo\'lishi kerak');

  await runTransaction(db, async (tx) => {
    const fromRef = doc(db, 'users', fromUid);
    const toRef   = doc(db, 'users', toUid);

    const fromSnap = await tx.get(fromRef);
    const toSnap   = await tx.get(toRef);

    if (!fromSnap.exists()) throw new Error('Yuboruvchi topilmadi');
    if (!toSnap.exists())   throw new Error('Qabul qiluvchi topilmadi');

    const fromBalance = fromSnap.data().balance ?? 0;
    if (fromBalance < amount) throw new Error('Balans yetarli emas');

    tx.update(fromRef, {
      balance:    fromBalance - amount,
      totalSpent: increment(amount),
    });
    tx.update(toRef, {
      balance:      increment(amount),
      totalEarned:  increment(amount),
    });
  });
};
