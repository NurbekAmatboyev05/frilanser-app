import { acceptApplication, dismissApplication } from '../repositories/applicationRepository';

/**
 * Arizani qabul qilish (pending → accepted)
 */
export const hireFreelancer = async (appId) => {
  await acceptApplication(appId);
};

/**
 * Frilanserni chetlatish (accepted → dismissed)
 */
export const fireFreelancer = async (appId, reason = '') => {
  await dismissApplication(appId, reason);
};
