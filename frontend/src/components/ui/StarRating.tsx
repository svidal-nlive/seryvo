import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: StarRatingProps) {
  const iconSize = sizeMap[size];

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`focus:outline-none transition-transform ${
            !readOnly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
          }`}
        >
          <Star
            size={iconSize}
            className={`${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
