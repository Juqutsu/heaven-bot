const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { BUGS_CHANNEL_ID } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bug')
    .setDescription('Report a bug to the development team'),
  
  async execute(interaction) {
    // Create a modal for bug submission
    const modal = new ModalBuilder()
      .setCustomId('bugReportModal')
      .setTitle('Report a Bug');
    
    // Create the text input components
    const titleInput = new TextInputBuilder()
      .setCustomId('bugTitle')
      .setLabel('Bug Title')
      .setPlaceholder('Brief description of the bug')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
      
    const descriptionInput = new TextInputBuilder()
      .setCustomId('bugDescription')
      .setLabel('Bug Description')
      .setPlaceholder('Detailed explanation of what happened')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);
      
    const stepsInput = new TextInputBuilder()
      .setCustomId('bugSteps')
      .setLabel('Steps to Reproduce')
      .setPlaceholder('Steps to reproduce the bug (if applicable)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1000);
    
    // Add inputs to the modal
    const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
    const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(stepsInput);
    
    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
    
    // Show the modal to the user
    await interaction.showModal(modal);
  },
  
  // Modal submission handler
  async modalSubmit(interaction) {
    // Get the data entered by the user
    const bugTitle = interaction.fields.getTextInputValue('bugTitle');
    const bugDescription = interaction.fields.getTextInputValue('bugDescription');
    const bugSteps = interaction.fields.getTextInputValue('bugSteps') || 'Not provided';
    
    // Create an embed for the bug report
    const bugEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle(`Bug Report: ${bugTitle}`)
      .addFields(
        { name: 'Description', value: bugDescription },
        { name: 'Steps to Reproduce', value: bugSteps },
        { name: 'Reported By', value: `${interaction.user.tag} (${interaction.user.id})` },
        { name: 'Status', value: '🔍 Under Review' }
      )
      .setTimestamp();
    
    try {
      // Get the bug reports channel ID from config
      const bugsChannelId = BUGS_CHANNEL_ID;
      
      if (!bugsChannelId) {
        await interaction.reply({ 
          content: 'Error: The bug reports channel has not been configured. Please contact an administrator.',
          ephemeral: true 
        });
        return;
      }
      
      // Get the bug reports channel
      const bugsChannel = await interaction.client.channels.fetch(bugsChannelId);
      
      if (!bugsChannel) {
        await interaction.reply({ 
          content: 'Error: Could not find the bug reports channel. Please contact an administrator.',
          ephemeral: true 
        });
        return;
      }
      
      // Send the bug report to the channel first to get message ID
      const sentMessage = await bugsChannel.send({ 
        embeds: [bugEmbed]
      });
      
      // Use message ID instead of user ID for security
      const messageId = sentMessage.id;
      
      // Create buttons for bug report management with message ID
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`bug_inprogress_${messageId}`)
            .setLabel('🔧 In Progress')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`bug_fixed_${messageId}`)
            .setLabel('✅ Fixed')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`bug_invalid_${messageId}`)
            .setLabel('❌ Invalid')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`bug_wontfix_${messageId}`)
            .setLabel('⏭️ Won\'t Fix')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Store message ID and user ID mapping in embed footer for retrieval
      bugEmbed.setFooter({ text: `Report ID: ${messageId} | User ID: ${interaction.user.id}` });
      
      // Update message with buttons and footer
      await sentMessage.edit({ 
        embeds: [bugEmbed],
        components: [actionRow]
      });
      
      // Confirm to the user
      await interaction.reply({ 
        content: 'Thank you for your bug report! Our team will investigate the issue and you will be notified when there is an update.',
        ephemeral: true 
      });
    } catch (error) {
      logger.error('Error handling bug report:', error);
      await interaction.reply({ 
        content: 'There was an error while submitting your bug report. Please try again later.',
        ephemeral: true 
      });
    }
  },
  
  // Button interaction handler
  async buttonInteract(interaction) {
    try {
      // Extract status and message ID from button custom ID
      // Format: bug_[status]_[messageId]
      const parts = interaction.customId.split('_');
      if (parts.length < 3) {
        await interaction.reply({
          content: 'Error: Invalid button interaction.',
          ephemeral: true
        });
        return;
      }
      
      const status = parts[1];
      const messageId = parts.slice(2).join('_'); // Handle message IDs that might have underscores
      
      // Check if user has admin permissions
      if (!interaction.member || !interaction.member.permissions.has('Administrator')) {
        await interaction.reply({
          content: 'You do not have permission to manage bug reports.',
          ephemeral: true
        });
        return;
      }
      
      // Get the message that contains the bug report
      const message = interaction.message;
      if (!message || !message.embeds || message.embeds.length === 0) {
        await interaction.reply({
          content: 'Error: Could not find the bug report embed.',
          ephemeral: true
        });
        return;
      }
      
      const embed = message.embeds[0];
      
      // Extract user ID from embed footer
      let userId = null;
      if (embed.footer && embed.footer.text) {
        const footerMatch = embed.footer.text.match(/User ID: (\d+)/);
        if (footerMatch) {
          userId = footerMatch[1];
        }
      }
      
      if (!userId) {
        await interaction.reply({
          content: 'Error: Could not find the user who reported this bug.',
          ephemeral: true
        });
        return;
      }
      
      let statusText;
      let statusColor;
      let notificationMessage;
      
      // Set the new status based on the button clicked
      switch (status) {
        case 'inprogress':
          statusText = '🔧 In Progress';
          statusColor = 0x3498DB; // Blue
          notificationMessage = 'Your bug report is now being worked on by our team.';
          break;
        case 'fixed':
          statusText = '✅ Fixed';
          statusColor = 0x2ECC71; // Green
          notificationMessage = 'Your bug report has been resolved! The fix will be available in the next update.';
          break;
        case 'invalid':
          statusText = '❌ Invalid';
          statusColor = 0xE74C3C; // Red
          notificationMessage = 'Your bug report has been marked as invalid. This might be because we couldn\'t reproduce it or it was not actually a bug.';
          break;
        case 'wontfix':
          statusText = '⏭️ Won\'t Fix';
          statusColor = 0x95A5A6; // Grey
          notificationMessage = 'Your bug report has been reviewed, but we\'ve decided not to implement a fix at this time.';
          break;
        default:
          statusText = '🔍 Under Review';
          statusColor = 0xFF0000; // Default Red
          notificationMessage = 'Your bug report status has been updated.';
      }
      
      // Create an updated embed with the new status
      const updatedEmbed = EmbedBuilder.from(embed)
        .setColor(statusColor);
      
      // Find the Status field and update it
      const fields = updatedEmbed.data.fields;
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].name === 'Status') {
          fields[i].value = statusText;
          break;
        }
      }
      
      // Add resolution info
      updatedEmbed.addFields({ 
        name: 'Resolution By', 
        value: `${interaction.user.tag} at ${new Date().toLocaleString()}` 
      });
      
      // Update the message with the new embed
      await message.edit({ embeds: [updatedEmbed] });
      
      // Try to DM the user who reported the bug
      try {
        // Extract user ID from the original report
        const user = await interaction.client.users.fetch(userId);
        
        if (user) {
          // Create a user notification embed
          const notificationEmbed = new EmbedBuilder()
            .setColor(statusColor)
            .setTitle('Bug Report Status Update')
            .setDescription(`Your bug report has been updated!`)
            .addFields(
              { name: 'Bug', value: embed.title.replace('Bug Report: ', '') },
              { name: 'New Status', value: statusText },
              { name: 'Message', value: notificationMessage }
            )
            .setTimestamp();
            
          await user.send({ embeds: [notificationEmbed] });
        }
      } catch (dmError) {
        logger.warn(`Could not DM user ${userId}: ${dmError.message}`);
      }
      
      // Reply to the interaction
      await interaction.reply({
        content: `Bug report status updated to ${statusText}`,
        ephemeral: true
      });
      
    } catch (error) {
      logger.error('Error handling button interaction:', error);
      await interaction.reply({
        content: 'There was an error while updating the bug report status.',
        ephemeral: true
      });
    }
  }
}; 