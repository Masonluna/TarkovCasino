const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("register")
        .setDescription("registers a new user"),
    async execute(interaction, profileData) {
        const { registered } = profileData;
        const nickname = interaction.member?.nickname;
        const username = nickname || interaction.user.globalName || interaction.user.username;

        if (!registered) {
            profileData.registered = true;
            profileData.balance = 100000;
            await profileData.save();
            await interaction.reply(`${username} has successfully registered. Welcome to the Tarkov Casino.\n You will start with an initial balance of 100,000 rubles`);
        } else {
            await interaction.reply(`${username} has already registered.`);
        }

    }
};