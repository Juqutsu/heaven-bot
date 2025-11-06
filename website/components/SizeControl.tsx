'use client';

import { Maximize2 } from 'lucide-react';

interface SizeControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function SizeControl({ 
  label, 
  value, 
  min = 0, 
  max = 100, 
  step = 1,
  unit = 'px',
  onChange 
}: SizeControlProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 flex items-center space-x-2">
        <Maximize2 className="w-4 h-4" />
        <span>{label}</span>
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-[#40444b] rounded-lg appearance-none cursor-pointer accent-[#5865F2]"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
          className="w-24 px-2 py-1 bg-[#40444b] border border-[#36393f] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
        />
        <span className="text-xs text-gray-400 w-8">{unit}</span>
      </div>
    </div>
  );
}

