const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserBalance, earnCoins, spendCoins, setUserBalance, transferCoins } = require('../utils/economy');
const { isAdmin } = require('../utils/admin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-coins')
    .setDescription('Admin: Manage user coins')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Give coins to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to give coins to')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of coins to give')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('take')
        .setDescription('Take coins from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to take coins from')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of coins to take')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a user\'s coin balance')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to set balance for')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('New coin balance')
            .setRequired(true)
            .setMinValue(0)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('balance')
        .setDescription('Check a user\'s coin balance')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to check balance for')
            .setRequired(true))),
  async execute(interaction) {
    // Check admin permissions
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');

    if (subcommand === 'give') {
      const amount = interaction.options.getInteger('amount');
      const awarded = await earnCoins(user.id, amount, 'admin', {
        description: `Admin: ${interaction.user.tag} gave ${amount} coins`
      });

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Coins Given')
        .setDescription(`Gave **${awarded.toLocaleString()}** coins to ${user.toString()}`)
        .addFields(
          { name: 'Admin', value: interaction.user.toString(), inline: true },
          { name: 'Amount', value: `${awarded.toLocaleString()} coins`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'take') {
      const amount = interaction.options.getInteger('amount');
      const balance = getUserBalance(user.id);

      if (balance < amount) {
        return interaction.reply({
          content: `User only has ${balance.toLocaleString()} coins. Cannot take ${amount.toLocaleString()} coins.`,
          ephemeral: true
        });
      }

      const taken = await spendCoins(user.id, amount, 'admin', {
        description: `Admin: ${interaction.user.tag} took ${amount} coins`
      });

      if (!taken) {
        return interaction.reply({
          content: 'Failed to take coins.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Coins Taken')
        .setDescription(`Took **${amount.toLocaleString()}** coins from ${user.toString()}`)
        .addFields(
          { name: 'Admin', value: interaction.user.toString(), inline: true },
          { name: 'Amount', value: `${amount.toLocaleString()} coins`, inline: true },
          { name: 'Remaining Balance', value: `${(balance - amount).toLocaleString()} coins`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'set') {
      const amount = interaction.options.getInteger('amount');
      const oldBalance = getUserBalance(user.id);
      setUserBalance(user.id, amount);

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('⚙️ Balance Set')
        .setDescription(`Set ${user.toString()}'s balance to **${amount.toLocaleString()}** coins`)
        .addFields(
          { name: 'Admin', value: interaction.user.toString(), inline: true },
          { name: 'Old Balance', value: `${oldBalance.toLocaleString()} coins`, inline: true },
          { name: 'New Balance', value: `${amount.toLocaleString()} coins`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'balance') {
      const balance = getUserBalance(user.id);

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('💰 User Balance')
        .setDescription(`${user.toString()}'s balance: **${balance.toLocaleString()}** coins`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

