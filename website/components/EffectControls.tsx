'use client';

import { Palette, Moon, Sparkles } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { SizeControl } from './SizeControl';
import { VisibilityToggle } from './VisibilityToggle';

interface EffectControlsProps {
  settings: {
    shadowEnabled: boolean;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowColor: string;
    backgroundStyle: 'solid' | 'gradient';
    accentBarPosition: 'left' | 'right' | 'top' | 'bottom';
    accentBarWidth: number;
    accentBarOpacity: number;
  };
  onChange: (updates: Partial<EffectControlsProps['settings']>) => void;
}

export function EffectControls({ settings, onChange }: EffectControlsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">Visual Effects</h3>
      </div>

      {/* Shadow Effects */}
      <div className="space-y-4 p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
        <div className="flex items-center space-x-2 mb-3">
          <Moon className="w-4 h-4 text-[#5865F2]" />
          <h4 className="font-medium text-white">Shadow Effects</h4>
        </div>
        <VisibilityToggle
          label="Enable Shadow"
          visible={settings.shadowEnabled}
          onChange={(visible) => onChange({ shadowEnabled: visible })}
        />
        {settings.shadowEnabled && (
          <div className="space-y-3 mt-3">
            <SizeControl
              label="Blur"
              value={settings.shadowBlur}
              min={0}
              max={50}
              onChange={(value) => onChange({ shadowBlur: value })}
            />
            <SizeControl
              label="Offset X"
              value={settings.shadowOffsetX}
              min={-20}
              max={20}
              onChange={(value) => onChange({ shadowOffsetX: value })}
            />
            <SizeControl
              label="Offset Y"
              value={settings.shadowOffsetY}
              min={-20}
              max={20}
              onChange={(value) => onChange({ shadowOffsetY: value })}
            />
            <ColorPicker
              label="Shadow Color"
              value={settings.shadowColor}
              onChange={(color) => onChange({ shadowColor: color || '#000000' })}
              defaultColor="#000000"
            />
          </div>
        )}
      </div>

      {/* Background Style */}
      <div className="space-y-4 p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
        <div className="flex items-center space-x-2 mb-3">
          <Palette className="w-4 h-4 text-[#5865F2]" />
          <h4 className="font-medium text-white">Background Style</h4>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Style</label>
          <select
            value={settings.backgroundStyle}
            onChange={(e) => onChange({ backgroundStyle: e.target.value as 'solid' | 'gradient' })}
            className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
          >
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
          </select>
        </div>
      </div>

      {/* Accent Bar */}
      <div className="space-y-4 p-4 bg-[#40444b] rounded-lg border border-[#36393f]">
        <h4 className="font-medium text-white mb-3">Accent Bar</h4>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Position</label>
          <select
            value={settings.accentBarPosition}
            onChange={(e) => onChange({ accentBarPosition: e.target.value as any })}
            className="w-full px-3 py-2 bg-[#2f3136] border border-[#36393f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        <SizeControl
          label="Width"
          value={settings.accentBarWidth}
          min={2}
          max={20}
          onChange={(value) => onChange({ accentBarWidth: value })}
        />
        <SizeControl
          label="Opacity"
          value={Math.round(settings.accentBarOpacity * 100)}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onChange({ accentBarOpacity: value / 100 })}
        />
      </div>
    </div>
  );
}

