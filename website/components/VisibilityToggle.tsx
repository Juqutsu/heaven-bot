'use client';

import { Eye, EyeOff } from 'lucide-react';

interface VisibilityToggleProps {
  label: string;
  visible: boolean;
  onChange: (visible: boolean) => void;
}

export function VisibilityToggle({ label, visible, onChange }: VisibilityToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
        {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        <span>{label}</span>
      </label>
      <button
        type="button"
        onClick={() => onChange(!visible)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          visible ? 'bg-[#5865F2]' : 'bg-[#40444b]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            visible ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

