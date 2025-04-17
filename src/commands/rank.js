const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateRankCard } = require('../utils/leveling');
const { getUserData, calculateRequiredXp } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Shows your rank card or the rank card of another user')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to show the rank card for (defaults to yourself)')
        .setRequired(false)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'rank');
      
      // Get target user
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetMember = interaction.options.getMember('user') || interaction.member;
      
      // Generate rank card
      const rankCardBuffer = await generateRankCard(targetMember);
      
      // Create attachment
      const attachment = new AttachmentBuilder(rankCardBuffer, { name: 'rank-card.png' });
      
      // Send rank card without additional text content
      await interaction.editReply({
        files: [attachment]
      });
    } catch (error) {
      console.error('Error generating rank card:', error);
      await interaction.editReply('There was an error generating the rank card. Please try again later.');
    }
  },
}; 