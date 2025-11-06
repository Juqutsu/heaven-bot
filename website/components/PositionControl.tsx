'use client';

import { Move } from 'lucide-react';

interface PositionControlProps {
  label: string;
  x: number;
  y: number;
  maxX?: number;
  maxY?: number;
  onChange: (x: number, y: number) => void;
}

export function PositionControl({ 
  label, 
  x, 
  y, 
  maxX = 1000, 
  maxY = 280, 
  onChange 
}: PositionControlProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300 flex items-center space-x-2">
        <Move className="w-4 h-4" />
        <span>{label}</span>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">X Position</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max={maxX}
              value={x}
              onChange={(e) => onChange(Number(e.target.value), y)}
              className="flex-1 h-2 bg-[#40444b] rounded-lg appearance-none cursor-pointer accent-[#5865F2]"
            />
            <input
              type="number"
              min="0"
              max={maxX}
              value={x}
              onChange={(e) => onChange(Math.max(0, Math.min(maxX, Number(e.target.value))), y)}
              className="w-20 px-2 py-1 bg-[#40444b] border border-[#36393f] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Y Position</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max={maxY}
              value={y}
              onChange={(e) => onChange(x, Number(e.target.value))}
              className="flex-1 h-2 bg-[#40444b] rounded-lg appearance-none cursor-pointer accent-[#5865F2]"
            />
            <input
              type="number"
              min="0"
              max={maxY}
              value={y}
              onChange={(e) => onChange(x, Math.max(0, Math.min(maxY, Number(e.target.value))))}
              className="w-20 px-2 py-1 bg-[#40444b] border border-[#36393f] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

