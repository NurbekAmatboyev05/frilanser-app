import { saveReview, subscribeToReviews, getAverageRating, hasReviewed } from '../repositories/reviewRepository';
import { markEmployerReviewed, markFreelancerReviewed } from '../repositories/applicationRepository';

/**
 * Employer → Freelancer review
 */
export const submitEmployerReview = async ({ fromUid, toUid, applicationId, rating, comment }) => {
  const already = await hasReviewed(fromUid, applicationId);
  if (already) throw new Error('ALREADY_REVIEWED');

  await saveReview({
    fromUid,
    toUid,
    applicationId,
    rating,
    comment,
    type: 'employer_to_freelancer',
  });
  await markEmployerReviewed(applicationId);
};

/**
 * Freelancer → Employer review
 */
export const submitFreelancerReview = async ({ fromUid, toUid, applicationId, rating, comment }) => {
  const already = await hasReviewed(fromUid, applicationId);
  if (already) throw new Error('ALREADY_REVIEWED');

  await saveReview({
    fromUid,
    toUid,
    applicationId,
    rating,
    comment,
    type: 'freelancer_to_employer',
  });
  await markFreelancerReviewed(applicationId);
};

export { subscribeToReviews, getAverageRating };
