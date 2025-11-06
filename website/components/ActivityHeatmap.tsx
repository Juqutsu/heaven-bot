'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface HeatmapData {
  date: string;
  value: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  maxValue?: number;
}

export function ActivityHeatmap({ data, maxValue }: ActivityHeatmapProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  // Group data by week
  const weeks = useMemo(() => {
    const weekMap = new Map<string, HeatmapData[]>();
    
    for (const item of data) {
      const date = new Date(item.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(item);
    }

    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekKey, items]) => ({
        weekKey,
        days: items.sort((a, b) => a.date.localeCompare(b.date)),
      }));
  }, [data]);

  const getIntensity = (value: number): string => {
    if (value === 0) return 'bg-[#1f2937]';
    const intensity = Math.min(value / max, 1);
    if (intensity < 0.25) return 'bg-[#5865F2]/20';
    if (intensity < 0.5) return 'bg-[#5865F2]/40';
    if (intensity < 0.75) return 'bg-[#5865F2]/60';
    return 'bg-[#5865F2]';
  };

  const getDayLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.getDate().toString();
  };

  const getMonthLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-4">
        <Calendar className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">Activity Heatmap</h3>
      </div>
      
      <div className="overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {weeks.map((week, weekIndex) => (
            <div key={week.weekKey} className="flex flex-col space-y-1">
              {weekIndex === 0 && (
                <div className="h-4 text-xs text-gray-400 text-center">
                  {getMonthLabel(week.days[0]?.date || week.weekKey)}
                </div>
              )}
              {week.days.map((day) => (
                <div
                  key={day.date}
                  className={`w-3 h-3 rounded ${getIntensity(day.value)} border border-[#36393f] hover:border-[#5865F2] transition-colors cursor-pointer`}
                  title={`${day.date}: ${day.value} activities`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
        <span>Less</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 rounded bg-[#1f2937] border border-[#36393f]" />
          <div className="w-3 h-3 rounded bg-[#5865F2]/20 border border-[#36393f]" />
          <div className="w-3 h-3 rounded bg-[#5865F2]/40 border border-[#36393f]" />
          <div className="w-3 h-3 rounded bg-[#5865F2]/60 border border-[#36393f]" />
          <div className="w-3 h-3 rounded bg-[#5865F2] border border-[#36393f]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

