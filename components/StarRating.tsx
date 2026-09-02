'use client';

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export default function StarRating({ label, value, onChange }: StarRatingProps) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-800 mb-2 text-center">{label}</label>
      <div className="flex justify-center space-x-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => onChange(star)}
            className={`text-3xl focus:outline-none transition-colors ${star <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
          >★</button>
        ))}
      </div>
    </div>
  );
}
