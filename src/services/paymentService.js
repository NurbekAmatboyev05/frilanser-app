import { transferBalance, getUserBalance, topUpBalance } from '../repositories/userRepository';
import { markAsPaid } from '../repositories/applicationRepository';
import { saveTransaction } from '../repositories/transactionRepository';

/**
 * To'lov jarayoni — Dashboard tomonidan chaqiriladi:
 */
export const processJobPayment = async ({ 
  employerId, employerEmail, employerName,
  freelancerId, freelancerEmail, freelancerName,
  jobId, jobTitle, applicationId, amount 
}) => {
  
  // 1. Balans yetarlimi?
  const balance = await getUserBalance(employerId);
  if (balance < amount) {
    throw new Error(`INSUFFICIENT_BALANCE:${balance}:${amount}`);
  }

  // 2. Atomic balans o'tkazma
  await transferBalance({
    fromUid: employerId,
    toUid:   freelancerId,
    amount,
  });

  // 3. Ariza holatini yangilash
  await markAsPaid(applicationId);

  // 4. Tranzaksiya yozuvi saqlash
  await saveTransaction({
    fromUid:       employerId,
    fromEmail:     employerEmail,
    fromName:      employerName,
    toUid:         freelancerId,
    toEmail:       freelancerEmail,
    toName:        freelancerName,
    amount,
    jobId:         jobId,
    applicationId: applicationId,
    jobTitle:      jobTitle,
  });
};

/**
 * Balansni to'ldirish (virtual — demo)
 */
export const addFunds = async (uid, amount) => {
  await topUpBalance(uid, amount);
};

export { getUserBalance };
