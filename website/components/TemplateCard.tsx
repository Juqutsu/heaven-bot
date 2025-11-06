'use client';

import { Palette, User, TrendingUp, Download } from 'lucide-react';
import { RankCardSettings } from '@/lib/rankCardDefaults';

interface Template {
  templateId: string;
  name: string;
  description: string | null;
  settings: RankCardSettings | null;
  createdBy: {
    userId: string;
    xp: number;
    level: number;
    prestige: number;
  } | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: number;
}

interface TemplateCardProps {
  template: Template;
  onApply?: (template: Template) => void;
  onPreview?: (template: Template) => void;
}

export function TemplateCard({ template, onApply, onPreview }: TemplateCardProps) {
  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20 hover:border-[#5865F2]/50 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-gray-400 mt-1">{template.description}</p>
            )}
          </div>
        </div>
      </div>

      {template.createdBy && (
        <div className="flex items-center space-x-2 mb-4 text-sm text-gray-400">
          <User className="w-4 h-4" />
          <span>User {template.createdBy.userId.slice(0, 8)}...</span>
          {template.createdBy.prestige > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-full">
              P{template.createdBy.prestige}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <TrendingUp className="w-4 h-4" />
          <span>{template.usageCount} uses</span>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(template.createdAt * 1000).toLocaleDateString()}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {onPreview && (
          <button
            onClick={() => onPreview(template)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Preview</span>
          </button>
        )}
        {onApply && (
          <button
            onClick={() => onApply(template)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-lg hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40"
          >
            <Palette className="w-4 h-4" />
            <span>Apply</span>
          </button>
        )}
      </div>
    </div>
  );
}

