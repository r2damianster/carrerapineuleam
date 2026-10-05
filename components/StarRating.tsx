'use client';

interface StarRatingProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

// Sin valor por defecto: arranca vacío para que una estrella marcada sea una respuesta real.
export default function StarRating({ label, value, onChange }: StarRatingProps) {
  const selectedStars = value ?? 0;
  return (
    <div>
      <label className="block text-sm font-bold text-gray-800 mb-2 text-center">{label}</label>
      <div className="flex justify-center space-x-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => onChange(star)}
            aria-label={`${star} de 5`}
            className={`text-3xl focus:outline-none transition-colors ${star <= selectedStars ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
          >★</button>
        ))}
      </div>
    </div>
  );
}
