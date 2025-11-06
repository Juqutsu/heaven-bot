import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const db = getDatabase();

    // Get guild info
    const guild = db.prepare(`
      SELECT 
        guild_id,
        name,
        description,
        icon,
        leader_id,
        level,
        experience,
        coins,
        max_members,
        created_at
      FROM guilds
      WHERE guild_id = ?
    `).get(guildId) as any;

    if (!guild) {
      return NextResponse.json(
        { success: false, error: 'Guild not found' },
        { status: 404 }
      );
    }

    // Get leader data
    const leader = db.prepare(`
      SELECT user_id, xp, level, prestige
      FROM users
      WHERE user_id = ?
    `).get(guild.leader_id) as any;

    // Get guild members with their contributions
    const members = db.prepare(`
      SELECT 
        gm.user_id,
        gm.role,
        gm.joined_at,
        gm.contribution_xp,
        gm.contribution_coins,
        u.xp,
        u.level,
        u.prestige,
        u.coins,
        u.reputation
      FROM guild_members gm
      JOIN users u ON gm.user_id = u.user_id
      WHERE gm.guild_id = ?
      ORDER BY gm.contribution_xp DESC, gm.contribution_coins DESC
    `).all(guildId) as any[];

    // Get guild statistics
    const totalXp = members.reduce((sum, m) => sum + (m.contribution_xp || 0), 0);
    const totalCoins = members.reduce((sum, m) => sum + (m.contribution_coins || 0), 0);

    // Get guild leaderboard data
    const leaderboard = db.prepare(`
      SELECT 
        period_type,
        period_key,
        total_xp,
        total_coins,
        member_count,
        rank,
        updated_at
      FROM guild_leaderboards
      WHERE guild_id = ?
      ORDER BY period_type, period_key DESC
      LIMIT 10
    `).all(guildId) as any[];

    return NextResponse.json({
      success: true,
      data: {
        guildId: guild.guild_id,
        name: guild.name,
        description: guild.description,
        icon: guild.icon,
        leaderId: guild.leader_id,
        leader: leader ? {
          userId: leader.user_id,
          xp: leader.xp,
          level: leader.level,
          prestige: leader.prestige,
        } : null,
        level: guild.level,
        experience: guild.experience,
        coins: guild.coins,
        maxMembers: guild.max_members,
        memberCount: members.length,
        totalXp,
        totalCoins,
        createdAt: guild.created_at,
        members: members.map((m) => ({
          userId: m.user_id,
          role: m.role,
          joinedAt: m.joined_at,
          contributionXp: m.contribution_xp || 0,
          contributionCoins: m.contribution_coins || 0,
          xp: m.xp,
          level: m.level,
          prestige: m.prestige,
          coins: m.coins,
          reputation: m.reputation,
        })),
        leaderboard: leaderboard.map((l) => ({
          periodType: l.period_type,
          periodKey: l.period_key,
          totalXp: l.total_xp,
          totalCoins: l.total_coins,
          memberCount: l.member_count,
          rank: l.rank,
          updatedAt: l.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching guild:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guild' },
      { status: 500 }
    );
  }
}

