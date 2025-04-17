const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPrestigeSettings, savePrestigeSettings } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prestige')
    .setDescription('Manage the prestige system settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List the current prestige levels'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Configure a prestige level')
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('The prestige level to configure (1-5)')
            .setMinValue(1)
            .setMaxValue(5)
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name for this prestige level'))
        .addIntegerOption(option =>
          option
            .setName('required_level')
            .setDescription('The level required to reach this prestige')
            .setMinValue(1))
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('The color for this prestige (hex code, e.g., #FF0000)'))
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role for this prestige'))
        .addNumberOption(option =>
          option
            .setName('xp_boost')
            .setDescription('XP boost as a decimal (e.g., 0.05 for 5%)')
            .setMinValue(0)
            .setMaxValue(0.5))),
  
  async execute(interaction) {
    // Update command stats
    updateCommandStats(interaction.user.id, 'prestige');
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'list') {
      await handleListCommand(interaction);
    } else if (subcommand === 'set') {
      await handleSetCommand(interaction);
    }
  },
};

/**
 * Handle the list subcommand
 * @param {Object} interaction - Command interaction
 */
async function handleListCommand(interaction) {
  const prestigeSettings = getPrestigeSettings();
  
  // Create embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⭐ Prestige Levels')
    .setDescription('The following prestige levels are configured:')
    .setTimestamp();
  
  // Add prestige levels
  const prestigeEntries = Object.entries(prestigeSettings.prestiges)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  
  for (const [level, config] of prestigeEntries) {
    const colorBox = config.color ? `■` : '□';
    const roleDisplay = config.roleId ? `<@&${config.roleId}>` : 'None';
    
    embed.addFields({
      name: `${colorBox} Level ${level}: ${config.name}`,
      value: `Required Level: ${config.requiredLevel}\n` +
             `XP Boost: +${Math.floor(config.xpBoost * 100)}%\n` +
             `Role: ${roleDisplay}\n` +
             `Color: ${config.color || 'None'}`,
      inline: true
    });
  }
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle the set subcommand
 * @param {Object} interaction - Command interaction
 */
async function handleSetCommand(interaction) {
  const prestigeLevel = interaction.options.getInteger('level');
  const name = interaction.options.getString('name');
  const requiredLevel = interaction.options.getInteger('required_level');
  const color = interaction.options.getString('color');
  const role = interaction.options.getRole('role');
  const xpBoost = interaction.options.getNumber('xp_boost');
  
  // Check if any options were provided
  if (name === null && requiredLevel === null && color === null && role === null && xpBoost === null) {
    await interaction.reply({ 
      content: '❌ You need to provide at least one setting to update.',
      ephemeral: true
    });
    return;
  }
  
  // Validate role if provided
  if (role !== null && role.managed) {
    await interaction.reply({ 
      content: '❌ You cannot assign managed roles (e.g., bot or integration roles) as prestige rewards.',
      ephemeral: true
    });
    return;
  }
  
  // Check bot permissions for role
  if (role !== null) {
    const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
    
    if (botMember.roles.highest.position <= role.position) {
      await interaction.reply({ 
        content: '❌ I cannot assign this role as it is higher than or equal to my highest role. Please move my role above it in the server settings.',
        ephemeral: true
      });
      return;
    }
  }
  
  // Validate color
  if (color !== null && !color.match(/^#[0-9A-Fa-f]{6}$/)) {
    await interaction.reply({ 
      content: '❌ The color must be a valid hex code (e.g., #FF0000).',
      ephemeral: true
    });
    return;
  }
  
  // Update settings
  const prestigeSettings = getPrestigeSettings();
  const currentConfig = prestigeSettings.prestiges[prestigeLevel] || {
    name: `Prestige ${prestigeLevel}`,
    requiredLevel: prestigeLevel * 100,
    color: null,
    roleId: null,
    xpBoost: prestigeLevel * 0.05
  };
  
  let changes = [];
  
  if (name !== null) {
    currentConfig.name = name;
    changes.push(`Name: ${name}`);
  }
  
  if (requiredLevel !== null) {
    currentConfig.requiredLevel = requiredLevel;
    changes.push(`Required Level: ${requiredLevel}`);
  }
  
  if (color !== null) {
    currentConfig.color = color;
    changes.push(`Color: ${color}`);
  }
  
  if (role !== null) {
    currentConfig.roleId = role.id;
    changes.push(`Role: ${role.name}`);
  }
  
  if (xpBoost !== null) {
    currentConfig.xpBoost = xpBoost;
    changes.push(`XP Boost: +${Math.floor(xpBoost * 100)}%`);
  }
  
  prestigeSettings.prestiges[prestigeLevel] = currentConfig;
  savePrestigeSettings(prestigeSettings);
  
  await interaction.reply({ 
    content: `✅ Successfully updated Prestige ${prestigeLevel} settings:\n- ${changes.join('\n- ')}`,
    ephemeral: true
  });
} 