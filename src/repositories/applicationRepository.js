import { db } from '../firebase';
import {
  doc, updateDoc, serverTimestamp
} from 'firebase/firestore';

/**
 * Arizani qabul qilish (pending → accepted)
 */
export const acceptApplication = async (appId) => {
  await updateDoc(doc(db, 'applications', appId), {
    status:     'accepted',
    acceptedAt: serverTimestamp(),
  });
};

/**
 * To'lov bajarildi (accepted → paid)
 */
export const markAsPaid = async (appId) => {
  await updateDoc(doc(db, 'applications', appId), {
    status: 'paid',
    paidAt: serverTimestamp(),
  });
};

/**
 * Frilanserni chetlatish (accepted → dismissed)
 */
export const dismissApplication = async (appId, reason = '') => {
  await updateDoc(doc(db, 'applications', appId), {
    status:       'dismissed',
    dismissedAt:  serverTimestamp(),
    dismissReason: reason,
  });
};

/**
 * Employer review qoldirdi deb belgilash
 */
export const markEmployerReviewed = async (appId) => {
  await updateDoc(doc(db, 'applications', appId), {
    employerReviewed: true,
  });
};

/**
 * Freelancer review qoldirdi deb belgilash
 */
export const markFreelancerReviewed = async (appId) => {
  await updateDoc(doc(db, 'applications', appId), {
    freelancerReviewed: true,
  });
};
