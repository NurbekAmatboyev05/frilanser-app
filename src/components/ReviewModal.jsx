import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

const t = {
  uz: {
    titleEmployer: "Frilanser haqida fikr qoldiring",
    titleFreelancer: "Ish beruvchi haqida fikr qoldiring",
    ratingLabel: "Reyting",
    commentLabel: "Izoh",
    commentPlaceholder: "Hamkorlik haqida fikringizni yozing...",
    submit: "Yuborish ✨",
    submitting: "Yuborilmoqda...",
    cancel: "O'tkazib yuborish",
    stars: ["", "Yomon", "Qoniqarsiz", "O'rtacha", "Yaxshi", "A'lo!"],
  },
  ru: {
    titleEmployer: "Оставьте отзыв о фрилансере",
    titleFreelancer: "Оставьте отзыв о работодателе",
    ratingLabel: "Рейтинг",
    commentLabel: "Комментарий",
    commentPlaceholder: "Напишите ваш отзыв о сотрудничестве...",
    submit: "Отправить ✨",
    submitting: "Отправка...",
    cancel: "Пропустить",
    stars: ["", "Плохо", "Неудовлетв.", "Средне", "Хорошо", "Отлично!"],
  },
};

const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`text-4xl transition-all transform active:scale-90 ${star <= display ? 'text-yellow-400' : 'text-white/10 hover:text-yellow-400/50'}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const ReviewModal = ({ targetEmail, isEmployerReviewing, onSubmit, onSkip }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { lang } = useLanguage();
  const tr = t[lang];

  const title = isEmployerReviewing ? tr.titleEmployer : tr.titleFreelancer;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setLoading(true);
    try {
      await onSubmit({ rating, comment });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate__animated animate__fadeIn">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate__animated animate__zoomIn animate__faster">
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/5">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-2xl">⭐</div>
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-xs text-gray-400 font-medium truncate max-w-[200px]">{targetEmail}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <label className="text-sm font-bold text-gray-300">{tr.ratingLabel}</label>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <span className="text-sm font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full animate__animated animate__bounceIn">
                {tr.stars[rating]}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300 ml-1">{tr.commentLabel}</label>
            <textarea
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm text-white"
              placeholder={tr.commentPlaceholder}
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="py-3.5 rounded-2xl border border-white/10 text-sm font-bold text-gray-400 hover:bg-white/5 transition-all active:scale-95 disabled:opacity-50"
              onClick={onSkip}
              disabled={loading}
            >
              {tr.cancel}
            </button>
            <button
              type="submit"
              className="py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? tr.submitting : tr.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
