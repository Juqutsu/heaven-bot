'use client';

import { formatNumber, formatMinutes } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  loading?: boolean;
  gradient?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, loading, gradient }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20 animate-pulse">
        <div className="h-4 bg-[#40444b] rounded w-1/2 mb-2" />
        <div className="h-8 bg-[#40444b] rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className={`group relative bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 hover:scale-105 ${gradient ? 'bg-gradient-to-br from-[#2f3136] to-[#36393f]' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</h3>
        {Icon && (
          <div className="p-2 rounded-lg bg-[#40444b] group-hover:bg-[#5865F2] transition-colors duration-300">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
