const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists all available commands'),
  async execute(interaction) {
    const { commands } = interaction.client;
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Available Commands')
      .setDescription('Here are all the commands you can use:')
      .setTimestamp()
      .setFooter({ text: 'Heaven Bot', iconURL: interaction.client.user.displayAvatarURL() });
    
    commands.forEach(command => {
      embed.addFields({ name: `/${command.data.name}`, value: command.data.description || 'No description provided' });
    });
    
    await interaction.reply({ embeds: [embed] });
  },
}; 