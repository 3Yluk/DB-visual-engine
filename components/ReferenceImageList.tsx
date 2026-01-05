import React from 'react';
import { Icons } from './Icons';
import { ReferenceImage } from '../types';

interface ReferenceImageListProps {
    images: ReferenceImage[];
    onRemove: (id: string) => void;
    onPreview: (image: ReferenceImage) => void;
}

export const ReferenceImageList: React.FC<ReferenceImageListProps> = ({ images, onRemove, onPreview }) => {
    if (images.length === 0) return null;

    return (
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 custom-scrollbar">
            {images.map((img) => (
                <div
                    key={img.id}
                    className="relative group flex-shrink-0 w-12 h-12 rounded-lg border border-stone-800 bg-stone-900 overflow-hidden cursor-pointer hover:border-stone-600 transition-colors"
                    onClick={() => onPreview(img)}
                >
                    <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(img.id);
                            }}
                            className="p-1 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full transition-transform hover:scale-110"
                            title="移除"
                        >
                            <Icons.X size={10} />
                        </button>
                    </div>
                </div>
            ))}
            <div className="text-[10px] text-stone-600 font-medium px-2 select-none">
                {images.length} 张参考图
            </div>
        </div>
    );
};
