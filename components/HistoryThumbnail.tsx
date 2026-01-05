import React from 'react';

interface HistoryThumbnailProps {
  imageUrl: string;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

export const HistoryThumbnail: React.FC<HistoryThumbnailProps> = ({
  imageUrl,
  index,
  isActive,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer
        transition-all duration-200 group
        ${isActive
          ? 'border-orange-500 ring-4 ring-orange-50 shadow-lg'
          : 'border-stone-200 hover:border-stone-300 hover:shadow-md'
        }
      `}
    >
      <img
        src={imageUrl}
        alt={`Generated ${index + 1}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      />

      {isActive && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full ring-2 ring-white shadow-md animate-pulse" />
      )}
    </div>
  );
};