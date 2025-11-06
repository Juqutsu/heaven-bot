'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Check, X } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface Friend {
  userId: string;
  xp: number;
  level: number;
  prestige: number;
  coins: number;
  reputation: number;
  acceptedAt: number;
}

interface FriendRequest {
  userId: string;
  xp: number;
  level: number;
  prestige: number;
  createdAt: number;
}

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFriends() {
      try {
        setLoading(true);
        const [friendsRes, requestsRes] = await Promise.all([
          fetch('/api/friends'),
          fetch('/api/friends/requests'),
        ]);

        const friendsData = await friendsRes.json();
        const requestsData = await requestsRes.json();

        if (friendsData.success) {
          setFriends(friendsData.data);
        }

        if (requestsData.success) {
          setRequests(requestsData.data);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFriends();
  }, []);

  const handleAcceptRequest = async (userId: string) => {
    try {
      const response = await fetch(`/api/friends/${userId}/accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Refresh friends and requests
        const [friendsRes, requestsRes] = await Promise.all([
          fetch('/api/friends'),
          fetch('/api/friends/requests'),
        ]);

        const friendsData = await friendsRes.json();
        const requestsData = await requestsRes.json();

        if (friendsData.success) {
          setFriends(friendsData.data);
        }

        if (requestsData.success) {
          setRequests(requestsData.data);
        }
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] animate-pulse">
        <div className="h-8 bg-[#40444b] rounded w-1/3 mb-4" />
        <div className="space-y-4">
          <div className="h-24 bg-[#40444b] rounded" />
          <div className="h-24 bg-[#40444b] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
          <div className="flex items-center space-x-2 mb-4">
            <UserPlus className="w-5 h-5 text-[#5865F2]" />
            <h2 className="text-xl font-bold text-white">Pending Friend Requests</h2>
          </div>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.userId}
                className="flex items-center justify-between p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="text-white font-medium">
                      User {request.userId.slice(0, 8)}...
                      {request.prestige > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-full">
                          P{request.prestige}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      Level {request.level} • {formatNumber(request.xp)} XP
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleAcceptRequest(request.userId)}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-[#5865F2]" />
          <h2 className="text-xl font-bold text-white">
            Friends ({friends.length})
          </h2>
        </div>
        {friends.length === 0 ? (
          <p className="text-gray-400">No friends yet. Send friend requests to get started!</p>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.userId}
                className="flex items-center justify-between p-4 bg-[#40444b] rounded-lg border border-[#36393f] hover:bg-[#36393f] hover:border-[#5865F2]/50 transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="text-white font-medium">
                      User {friend.userId.slice(0, 8)}...
                      {friend.prestige > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-full">
                          P{friend.prestige}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      Level {friend.level} • {formatNumber(friend.xp)} XP • {formatNumber(friend.coins)} coins
                    </div>
                  </div>
                </div>
                <a
                  href={`/compare?user1=${friend.userId}`}
                  className="px-4 py-2 bg-[#40444b] text-white rounded-lg hover:bg-[#36393f] transition-colors"
                >
                  Compare
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

