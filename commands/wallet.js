const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wallet")
        .setDescription("Shows a user their wallet"),
    async execute(interaction, profileData) {
        const { balance } = profileData;
        const nickname = interaction.member?.nickname;
        const username = nickname || interaction.user.globalName || interaction.user.username;

        if (!profileData.registered) {
            await interaction.reply(`${username} has not registered as a player in this casino.\n If you would like to play, please use the /register command`);
        }

        await interaction.reply(`${username} has ${balance} rubles`);
    }
};