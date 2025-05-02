const { SlashCommandBuilder } = require('discord.js');
const profileModel = require("../models/profileSchema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the top 10 users with the largest wallet'),

    async execute(interaction) {
        await interaction.deferReply();

        const usersShown = 10;

        const topProfiles = await profileModel.find()
            .sort({ balance: -1 })
            .limit(usersShown);

        if (topProfiles.length === 0) {
            return interaction.editReply("Leaderboard is empty!");
        }

        const memberFetchPromises = topProfiles.map(profile =>
            interaction.guild.members.fetch(profile.userId).catch(() => null)
        );
        const memberObjects = await Promise.all(memberFetchPromises);

        const leaderboardText = topProfiles.map((profile, index) => {
            const member = memberObjects[index];
            const displayName = member ? member.displayName : `Unknown User (${profile.userId})`;
            return `## **${index + 1}.** ${displayName} — **₽**${profile.balance.toLocaleString()}`;
        }).join('\n');

        await interaction.editReply({
            content: `# 🏆 **Leaderboard - Top 10**\n\n${leaderboardText}`
        });
    }
};
