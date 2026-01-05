import React, { useState, useEffect } from 'react';

export const StorageIndicator: React.FC = () => {
    const [usage, setUsage] = useState({ used: 0, total: 5 * 1024 * 1024, percent: 0 }); // Assume 5MB limit
    const [isHovered, setIsHovered] = useState(false);

    const calculateUsage = () => {
        let total = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length + key.length) * 2; // Approximating char size (UTF-16 is 2 bytes)
            }
        }
        // LocalStorage is usually limited by characters (approx 5M chars), not bytes directly, 
        // but typically 5MB string length. Let's simplify to string length for quota estimation.
        // Actually, typical quota is 5MB characters or 10MB bytes. 
        // Let's use 5MB chars as a safe baseline since QuotaExceeded happens there.

        const usedChars = total / 2; // Back to chars count roughly
        // Better estimation: JSON.stringify(localStorage).length

        let simpleTotal = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                simpleTotal += localStorage[key].length + key.length;
            }
        }

        const LIMIT = 5 * 1024 * 1024; // 5 Million characters
        const percent = Math.min(100, (simpleTotal / LIMIT) * 100);

        setUsage({
            used: simpleTotal,
            total: LIMIT,
            percent
        });
    };

    useEffect(() => {
        calculateUsage();
        // Recalculate every 2 seconds or add listener if possible
        const interval = setInterval(calculateUsage, 2000);
        return () => clearInterval(interval);
    }, []);

    const getColor = (p: number) => {
        if (p > 90) return 'bg-red-500';
        if (p > 70) return 'bg-orange-500';
        return 'bg-emerald-500';
    };

    return (
        <div
            className="flex items-center gap-2 px-2 py-1 rounded bg-stone-800/50 hover:bg-stone-800 transition-colors cursor-help relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex flex-col gap-0.5 w-24">
                <div className="flex justify-between text-[10px] text-stone-400 font-mono leading-none">
                    <span>STORAGE</span>
                    <span>{usage.percent.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-stone-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${getColor(usage.percent)}`}
                        style={{ width: `${usage.percent}%` }}
                    />
                </div>
            </div>

            {/* Tooltip */}
            <div className={`absolute top-full right-0 mt-2 p-2 bg-stone-900 border border-stone-700 rounded shadow-xl z-50 text-xs text-stone-300 w-48 pointer-events-none transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex justify-between mb-1">
                    <span>Used:</span>
                    <span className="font-mono text-white">{(usage.used / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span>Limit (Est):</span>
                    <span className="font-mono text-white">5.00 MB</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-tight">
                    *Browser LocalStorage is limited. Clear history to free up space.
                </p>
            </div>
        </div>
    );
};
