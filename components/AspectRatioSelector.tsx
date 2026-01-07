import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Icons from 'lucide-react';

interface AspectRatioSelectorProps {
  selectedRatio: string;
  is4K: boolean;
  onRatioChange: (ratio: string) => void;
  on4KChange: (is4K: boolean) => void;
  disabled?: boolean;
  apiMode?: 'official' | 'custom';
  language?: 'CN' | 'EN';
}

interface RatioOption {
  id: string;
  label: string;
  labelEn: string;
  width: number;
  height: number;
}

// Custom mode: 3 ratios (matches your proxy models)
const CUSTOM_RATIO_OPTIONS: RatioOption[] = [
  { id: '1:1', label: '正方', labelEn: 'Square', width: 24, height: 24 },
  { id: '9:16', label: '竖屏', labelEn: 'Portrait', width: 18, height: 32 },
  { id: '16:9', label: '横屏', labelEn: 'Landscape', width: 32, height: 18 },
];

// Official mode: 5 ratios (all supported by Gemini API)
const OFFICIAL_RATIO_OPTIONS: RatioOption[] = [
  { id: '1:1', label: '正方', labelEn: 'Square', width: 20, height: 20 },
  { id: '3:4', label: '竖屏', labelEn: 'Portrait', width: 18, height: 24 },
  { id: '4:3', label: '横屏', labelEn: 'Landscape', width: 24, height: 18 },
  { id: '9:16', label: '长竖', labelEn: 'Tall', width: 14, height: 26 },
  { id: '16:9', label: '宽屏', labelEn: 'Wide', width: 26, height: 14 },
];

// i18n text
const TEXT = {
  CN: {
    selectRatio: '选择比例',
    qualityOfficial: '高清 (2K)',
    qualityCustom: '4K 高画质',
    infoOfficial4K: '2K 分辨率，需要更多生成时间',
    infoOfficial1K: '1K 标准分辨率，快速生成',
    infoCustom4K: '启用 4K 画质，生成更高分辨率图像',
    infoCustom1K: '标准画质，适合快速预览',
  },
  EN: {
    selectRatio: 'Select Ratio',
    qualityOfficial: 'HD (2K)',
    qualityCustom: '4K Quality',
    infoOfficial4K: '2K resolution, takes more time',
    infoOfficial1K: '1K standard resolution, fast generation',
    infoCustom4K: '4K quality enabled, higher resolution',
    infoCustom1K: 'Standard quality, quick preview',
  },
};

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  selectedRatio,
  is4K,
  onRatioChange,
  on4KChange,
  disabled = false,
  apiMode = 'custom',
  language = 'CN',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const ratioOptions = apiMode === 'official' ? OFFICIAL_RATIO_OPTIONS : CUSTOM_RATIO_OPTIONS;
  const t = TEXT[language];

  // Update menu position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top - 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on scroll
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  const currentOption = ratioOptions.find(r => r.id === selectedRatio) || ratioOptions[0];

  // Render a visual ratio indicator
  const RatioIcon: React.FC<{ option: RatioOption; size?: number; isSelected?: boolean }> = ({
    option,
    size = 1,
    isSelected = false
  }) => {
    const scale = size;
    return (
      <div
        className={`rounded-sm border transition-all ${isSelected
            ? 'border-orange-400 bg-orange-400/20'
            : 'border-stone-500 bg-stone-700/50'
          }`}
        style={{
          width: option.width * scale,
          height: option.height * scale,
        }}
      />
    );
  };

  // Quality label based on mode
  const qualityLabel = apiMode === 'official'
    ? (is4K ? '2K' : '1K')
    : (is4K ? '4K' : '');

  // Get label based on language
  const getLabel = (option: RatioOption) => language === 'EN' ? option.labelEn : option.label;

  // Dropdown menu content
  const menuContent = (
    <div
      ref={menuRef}
      className="fixed bg-stone-800 border border-stone-700 rounded-xl shadow-2xl p-3 min-w-[220px]"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        transform: 'translateY(-100%)',
        zIndex: 9999,
      }}
    >
      {/* Ratio Options */}
      <div className={`flex items-center justify-between gap-2 mb-3 ${apiMode === 'official' ? 'flex-wrap justify-center' : ''}`}>
        {ratioOptions.map((option) => {
          const isSelected = selectedRatio === option.id;
          return (
            <button
              key={option.id}
              onClick={() => {
                onRatioChange(option.id);
              }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${apiMode === 'official' ? 'w-[56px]' : 'flex-1'
                } ${isSelected
                  ? 'bg-stone-700 ring-1 ring-orange-400/50'
                  : 'hover:bg-stone-700/50'
                }`}
            >
              {/* Fixed-size container for uniform icon box */}
              <div className="w-8 h-8 flex items-center justify-center">
                <RatioIcon option={option} size={apiMode === 'official' ? 0.75 : 0.9} isSelected={isSelected} />
              </div>
              <div className="flex flex-col items-center">
                <span className={`text-[10px] font-bold ${isSelected ? 'text-orange-400' : 'text-stone-400'}`}>
                  {option.id}
                </span>
                <span className="text-[9px] text-stone-500">
                  {getLabel(option)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-stone-700 my-2" />

      {/* Quality Toggle */}
      <button
        onClick={() => on4KChange(!is4K)}
        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-stone-700/50 transition-all"
      >
        <div className="flex items-center gap-2">
          <Icons.Sparkles size={14} className={is4K ? 'text-amber-400' : 'text-stone-500'} />
          <span className={`text-xs font-medium ${is4K ? 'text-amber-400' : 'text-stone-400'}`}>
            {apiMode === 'official' ? t.qualityOfficial : t.qualityCustom}
          </span>
        </div>
        <div
          className={`w-8 h-4 rounded-full transition-all relative ${is4K ? 'bg-amber-500' : 'bg-stone-600'}`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${is4K ? 'left-4' : 'left-0.5'}`}
          />
        </div>
      </button>

      {/* Info Text */}
      <p className="text-[9px] text-stone-500 mt-2 px-1">
        {apiMode === 'official'
          ? (is4K ? t.infoOfficial4K : t.infoOfficial1K)
          : (is4K ? t.infoCustom4K : t.infoCustom1K)
        }
      </p>

      {/* Mode indicator */}
      <div className="mt-2 pt-2 border-t border-stone-700/50">
        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${apiMode === 'official'
            ? 'bg-blue-900/30 text-blue-400'
            : 'bg-violet-900/30 text-violet-400'
          }`}>
          {apiMode === 'official' ? 'OFFICIAL API' : 'CUSTOM PROXY'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:bg-stone-700 cursor-pointer'
          } ${isOpen ? 'bg-stone-700' : ''}`}
        title={t.selectRatio}
      >
        <RatioIcon option={currentOption} size={0.5} isSelected={true} />
        <span className="text-[10px] text-stone-400 font-medium">
          {currentOption.id}
          {qualityLabel && <span className="ml-1 text-amber-400">{qualityLabel}</span>}
        </span>
        <Icons.ChevronDown size={10} className={`text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Portal: Render menu to body to avoid clipping */}
      {isOpen && ReactDOM.createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
          {menuContent}
        </>,
        document.body
      )}
    </div>
  );
};

export default AspectRatioSelector;
