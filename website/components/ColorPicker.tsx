'use client';

import { useState } from 'react';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
  defaultColor?: string;
}

const PRESET_COLORS = [
  '#5865F2', '#57F287', '#FEE75C', '#ED4245', '#EB459E',
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
];

export function ColorPicker({ label, value, onChange, defaultColor = '#5865F2' }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [hexInput, setHexInput] = useState(value || defaultColor);

  const handleColorChange = (color: string) => {
    setHexInput(color);
    onChange(color);
  };

  const handleHexInput = (hex: string) => {
    setHexInput(hex);
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
      onChange(hex);
    }
  };

  const handleReset = () => {
    setHexInput(defaultColor);
    onChange(null);
  };

  const displayColor = value || defaultColor;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-12 h-12 rounded-lg border-2 border-[#40444b] hover:border-[#5865F2] transition-colors shadow-lg"
          style={{ backgroundColor: displayColor }}
        >
          <span className="sr-only">Pick color</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#5865F2"
                className="w-full pl-10 pr-4 py-2 bg-[#40444b] border border-[#36393f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      
      {showPicker && (
        <div className="mt-3 p-4 bg-[#2f3136] border border-[#40444b] rounded-lg shadow-lg">
          <div className="grid grid-cols-5 gap-2 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorChange(color)}
                className="w-10 h-10 rounded-lg border-2 border-[#40444b] hover:border-[#5865F2] hover:scale-110 transition-all"
                style={{ backgroundColor: color }}
              >
                <span className="sr-only">{color}</span>
              </button>
            ))}
          </div>
          <input
            type="color"
            value={displayColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full h-10 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}

