'use client';

import { Layout, Sparkles } from 'lucide-react';
import { RankCardSettings } from '@/lib/rankCardDefaults';

interface LayoutPreset {
  name: string;
  description: string;
  settings: Partial<RankCardSettings>;
}

const PRESETS: LayoutPreset[] = [
  {
    name: 'Default',
    description: 'Original bot layout',
    settings: {
      avatar: { x: 40, y: 40 },
      username: { x: 280, y: 100 },
      prestige: { x: 280, y: 132 },
      level: { x: 960, y: 100 },
      xpInfo: { x: 280, y: 160 },
      progressBar: { x: 280, y: 200 },
      progressBarWidth: 680,
    },
  },
  {
    name: 'Right Avatar',
    description: 'Avatar on the right side',
    settings: {
      avatar: { x: 760, y: 40 },
      username: { x: 40, y: 100 },
      prestige: { x: 40, y: 132 },
      level: { x: 700, y: 100 },
      xpInfo: { x: 40, y: 160 },
      progressBar: { x: 40, y: 200 },
      progressBarWidth: 650,
    },
  },
  {
    name: 'Centered',
    description: 'All elements centered',
    settings: {
      avatar: { x: 400, y: 40 },
      username: { x: 500, y: 85 },
      usernameAlign: 'center',
      prestige: { x: 500, y: 120 },
      prestigeAlign: 'center',
      level: { x: 500, y: 150 },
      levelAlign: 'center',
      xpInfo: { x: 500, y: 175 },
      xpAlign: 'center',
      progressBar: { x: 160, y: 210 },
      progressBarWidth: 680,
      progressBarHeight: 20,
      progressTextAlign: 'center',
    },
  },
  {
    name: 'Minimal',
    description: 'Simplified layout',
    settings: {
      avatar: { x: 40, y: 50 },
      avatarSize: 150,
      username: { x: 220, y: 100 },
      prestige: { x: 220, y: 130 },
      showLevel: false,
      xpInfo: { x: 220, y: 160 },
      progressBar: { x: 220, y: 200 },
      progressBarWidth: 600,
    },
  },
  {
    name: 'Compact',
    description: 'Dense layout',
    settings: {
      avatar: { x: 20, y: 30 },
      avatarSize: 180,
      username: { x: 220, y: 85 },
      prestige: { x: 220, y: 115 },
      level: { x: 950, y: 85 },
      xpInfo: { x: 220, y: 140 },
      progressBar: { x: 220, y: 170 },
      progressBarWidth: 680,
    },
  },
  {
    name: 'Wide',
    description: 'Spread out layout',
    settings: {
      avatar: { x: 60, y: 40 },
      username: { x: 300, y: 100 },
      prestige: { x: 300, y: 132 },
      level: { x: 920, y: 100 },
      xpInfo: { x: 300, y: 160 },
      progressBar: { x: 300, y: 200 },
      progressBarWidth: 580,
    },
  },
  {
    name: 'Stacked',
    description: 'Vertical text stack',
    settings: {
      avatar: { x: 40, y: 40 },
      username: { x: 280, y: 80 },
      prestige: { x: 280, y: 115 },
      level: { x: 280, y: 145 },
      levelAlign: 'left',
      xpInfo: { x: 280, y: 175 },
      progressBar: { x: 280, y: 210 },
      progressBarWidth: 680,
    },
  },
  {
    name: 'Modern',
    description: 'Clean modern layout',
    settings: {
      avatar: { x: 50, y: 50 },
      avatarSize: 180,
      username: { x: 260, y: 95 },
      prestige: { x: 260, y: 125 },
      level: { x: 900, y: 95 },
      xpInfo: { x: 260, y: 155 },
      progressBar: { x: 260, y: 195 },
      progressBarWidth: 620,
    },
  },
];

interface LayoutPresetsProps {
  onApply: (settings: Partial<RankCardSettings>) => void;
}

export function LayoutPresets({ onApply }: LayoutPresetsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Layout className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">Layout Presets</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onApply(preset.settings)}
            className="p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:border-[#5865F2] hover:bg-[#36393f] transition-all duration-200 text-left group"
          >
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#5865F2] group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white">{preset.name}</span>
            </div>
            <p className="text-xs text-gray-400">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

