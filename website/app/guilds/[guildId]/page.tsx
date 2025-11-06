'use client';

import { use } from 'react';
import { GuildStats } from '@/components/GuildStats';
import { Users, Loader2 } from 'lucide-react';

export default function GuildPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">Guild Details</h1>
        </div>
        <p className="text-gray-400">View detailed guild information and member statistics</p>
      </div>

      <GuildStats guildId={guildId} />
    </div>
  );
}

