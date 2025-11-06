'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TrendData {
  date?: string;
  week?: string;
  month?: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: TrendData[];
  dataKey: string;
  color?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

export function TrendChart({ title, data, dataKey, color = '#5865F2', period = 'daily' }: TrendChartProps) {
  const formatLabel = (value: string) => {
    if (period === 'daily') {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period === 'weekly') {
      return value;
    } else {
      return value;
    }
  };

  const chartData = data.map((item) => ({
    label: item.date || item.week || item.month || '',
    value: item.value,
  }));

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#5865F2]" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#40444b" />
          <XAxis
            dataKey="label"
            stroke="#9ca3af"
            tickFormatter={formatLabel}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#2f3136',
              border: '1px solid #40444b',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: any) => [value, 'Value']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

