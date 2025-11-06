const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getRankSettings, saveRankSettings, calculateRequiredXp } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranks')
    .setDescription('Manage the rank system settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List the current rank rewards'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role reward for a level')
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('The level required to earn this role')
            .setMinValue(1)
            .setRequired(true))
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to award')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role reward for a level')
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('The level to remove the role reward from')
            .setMinValue(1)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Adjust rank system settings')
        .addNumberOption(option =>
          option
            .setName('text_xp')
            .setDescription('Base XP awarded for text messages')
            .setMinValue(1))
        .addIntegerOption(option =>
          option
            .setName('text_cooldown')
            .setDescription('Cooldown in seconds between XP awards for messages')
            .setMinValue(0))
        .addNumberOption(option =>
          option
            .setName('voice_xp')
            .setDescription('XP awarded per minute in voice chat')
            .setMinValue(1))
        .addBooleanOption(option =>
          option
            .setName('afk_disabled')
            .setDescription('Whether XP should be disabled for AFK users'))),
  
  async execute(interaction) {
    // Update command stats
    await updateCommandStats(interaction.user.id, 'ranks');
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'list') {
      await handleListCommand(interaction);
    } else if (subcommand === 'add') {
      await handleAddCommand(interaction);
    } else if (subcommand === 'remove') {
      await handleRemoveCommand(interaction);
    } else if (subcommand === 'settings') {
      await handleSettingsCommand(interaction);
    }
  },
};

/**
 * Handle the list subcommand
 * @param {Object} interaction - Command interaction
 */
async function handleListCommand(interaction) {
  const settings = await getRankSettings();
  const database = require('../utils/database').getDatabase();
  
  // Get role rewards from database
  const roleRows = database.prepare('SELECT level, role_id FROM ranks WHERE role_id IS NOT NULL ORDER BY level').all();
  
  // Create embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🏆 Rank Rewards')
    .setTimestamp();
  
  // Add rank settings section
  embed.addFields({
    name: 'Rank Settings',
    value: `Text XP: ${settings.textXp.baseAmount} (±${settings.textXp.randomBonus}) per message\n` +
           `Text Cooldown: ${settings.textXp.cooldown} seconds\n` +
           `Voice XP: ${settings.voiceXp.perMinute} per minute\n` +
           `AFK Disabled: ${settings.voiceXp.afkDisabled ? 'Yes' : 'No'}\n` +
           `XP Formula: ${settings.formula.baseXp} × (level ^ ${settings.formula.exponent})`,
    inline: false
  });
  
  // Add role rewards
  if (roleRows.length > 0) {
    let roleRewards = '';
    
    for (const row of roleRows) {
      const xpRequired = await calculateRequiredXp(row.level);
      roleRewards += `Level ${row.level} (${xpRequired.toLocaleString()} XP): <@&${row.role_id}>\n`;
    }
    
    embed.addFields({
      name: 'Role Rewards',
      value: roleRewards,
      inline: false
    });
  } else {
    embed.addFields({
      name: 'Role Rewards',
      value: 'No role rewards configured yet. Use `/ranks add` to add role rewards.',
      inline: false
    });
  }
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle the add subcommand
 * @param {Object} interaction - Command interaction
 */
async function handleAddCommand(interaction) {
  const level = interaction.options.getInteger('level');
  const role = interaction.options.getRole('role');
  
  // Validate role
  if (role.managed) {
    await interaction.reply({ 
      content: '❌ You cannot assign managed roles (e.g., bot or integration roles) as rank rewards.',
      ephemeral: true
    });
    return;
  }
  
  // Check bot permissions
  const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
  
  if (botMember.roles.highest.position <= role.position) {
    await interaction.reply({ 
      content: '❌ I cannot assign this role as it is higher than or equal to my highest role. Please move my role above it in the server settings.',
      ephemeral: true
    });
    return;
  }
  
  // Update database
  const database = require('../utils/database').getDatabase();
  const insert = database.prepare('INSERT OR REPLACE INTO ranks (level, role_id, updated_at) VALUES (?, ?, strftime("%s", "now"))');
  insert.run(level, role.id);
  
  const xpRequired = await calculateRequiredXp(level);
  
  await interaction.reply({ 
    content: `✅ Successfully set <@&${role.id}> as the reward for reaching level ${level} (${xpRequired.toLocaleString()} XP).`,
    ephemeral: true
  });
}

/**
 * Handle the remove subcommand
 * @param {Object} interaction - Command interaction
 */
async function handleRemoveCommand(interaction) {
  const level = interaction.options.getInteger('level');
  
  // Update database
  const database = require('../utils/database').getDatabase();
  const existing = database.prepare('SELECT role_id FROM ranks WHERE level = ?').get(level);
  
  if (!existing || !existing.role_id) {
    await interaction.reply({ 
      content: `❌ There is no role reward configured for level ${level}.`,
      ephemeral: true
    });
    return;
  }
  
  const removedRoleId = existing.role_id;
  const deleteStmt = database.prepare('DELETE FROM ranks WHERE level = ?');
  deleteStmt.run(level);
  
  await interaction.reply({ 
    content: `✅ Successfully removed the role reward <@&${removedRoleId}> from level ${level}.`,
    ephemeral: true
  });
}

/**
 * Handle the settings subcommand
 * @param {Object} interaction - Command interaction
 */
async function handleSettingsCommand(interaction) {
  const textXp = interaction.options.getNumber('text_xp');
  const textCooldown = interaction.options.getInteger('text_cooldown');
  const voiceXp = interaction.options.getNumber('voice_xp');
  const afkDisabled = interaction.options.getBoolean('afk_disabled');
  
  // Check if any options were provided
  if (textXp === null && textCooldown === null && voiceXp === null && afkDisabled === null) {
    await interaction.reply({ 
      content: '❌ You need to provide at least one setting to update.',
      ephemeral: true
    });
    return;
  }
  
  // Update settings
  const settings = await getRankSettings();
  let changes = [];
  
  if (textXp !== null) {
    settings.textXp.baseAmount = textXp;
    changes.push(`Text XP: ${textXp}`);
  }
  
  if (textCooldown !== null) {
    settings.textXp.cooldown = textCooldown;
    changes.push(`Text Cooldown: ${textCooldown} seconds`);
  }
  
  if (voiceXp !== null) {
    settings.voiceXp.perMinute = voiceXp;
    changes.push(`Voice XP: ${voiceXp} per minute`);
  }
  
  if (afkDisabled !== null) {
    settings.voiceXp.afkDisabled = afkDisabled;
    changes.push(`AFK Disabled: ${afkDisabled ? 'Yes' : 'No'}`);
  }
  
  await saveRankSettings(settings);
  
  await interaction.reply({ 
    content: `✅ Successfully updated rank settings:\n- ${changes.join('\n- ')}`,
    ephemeral: true
  });
} 