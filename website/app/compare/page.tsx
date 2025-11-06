'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserComparison } from '@/components/UserComparison';
import { Users, Search, Loader2 } from 'lucide-react';

export default function ComparePage() {
  const { data: session } = useSession();
  const [userId1, setUserId1] = useState(session?.user?.id || '');
  const [userId2, setUserId2] = useState('');
  const [compareData, setCompareData] = useState<{ userId1: string; userId2: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = () => {
    if (userId1 && userId2 && userId1 !== userId2) {
      setCompareData({ userId1, userId2 });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">User Comparison</h1>
        </div>
        <p className="text-gray-400">Compare stats between two users</p>
      </div>

      {/* User Input Form */}
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              User 1 ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={userId1}
                onChange={(e) => setUserId1(e.target.value)}
                placeholder="Enter user ID"
                className="w-full pl-10 pr-4 py-2 bg-[#40444b] border border-[#36393f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              User 2 ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={userId2}
                onChange={(e) => setUserId2(e.target.value)}
                placeholder="Enter user ID"
                className="w-full pl-10 pr-4 py-2 bg-[#40444b] border border-[#36393f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleCompare}
          disabled={!userId1 || !userId2 || userId1 === userId2 || loading}
          className="w-full md:w-auto px-6 py-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-lg hover:from-[#4752C4] hover:to-[#3c45a5] transition-all duration-200 shadow-lg shadow-[#5865F2]/30 hover:shadow-xl hover:shadow-[#5865F2]/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Comparing...</span>
            </>
          ) : (
            <>
              <Users className="w-4 h-4" />
              <span>Compare Users</span>
            </>
          )}
        </button>
        {userId1 === userId2 && userId1 && userId2 && (
          <p className="mt-2 text-sm text-red-400">Please enter two different user IDs</p>
        )}
      </div>

      {/* Comparison Results */}
      {compareData && (
        <UserComparison userId1={compareData.userId1} userId2={compareData.userId2} />
      )}
    </div>
  );
}

