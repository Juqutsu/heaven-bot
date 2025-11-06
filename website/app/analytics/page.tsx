'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { InsightsDashboard } from '@/components/InsightsDashboard';
import { BarChart3, Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[#5865F2] animate-spin" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">Analytics Dashboard</h1>
        </div>
        <p className="text-gray-400">Detailed insights into your activity and progress</p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}

