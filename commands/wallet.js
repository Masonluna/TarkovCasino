const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wallet")
        .setDescription("Shows a user their wallet"),
    async execute(interaction, profileData) {
        /**
         * Add this code if you want to only allow users to check their wallet in a specified channel.
         * if (interaction.channel.name !== "wallet") {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: `Wallets must be checked in the wallet channel!`
            });
        }*/
        const { balance } = profileData;
        const nickname = interaction.member?.nickname;
        const username = nickname || interaction.user.globalName || interaction.user.username;

        if (!profileData.registered) {
            await interaction.reply(`${username} has not registered as a player in this casino.\n If you would like to play, please use the /register command`);
        }

        await interaction.reply(`${username} has ${balance.toLocaleString()} rubles`);
    }
};