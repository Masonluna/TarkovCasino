const { SlashCommandBuilder, MessageFlags } = require("discord.js");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("scavroll")
        .setDescription("Roll a number from 1-100. Win on a 55 or more.")
        .addIntegerOption(
            (option) =>
                option
                    .setName("bet")
                    .setDescription("Choose the amount you want to bet")
                    .setRequired(true)
        ),

    async execute(interaction, profileData) {
        if (interaction.channel.name !== "scav-roll") {
            return interaction.reply({
                flags: MessageFlags.Ephemral,
                content: `High Roll can only be played in the highroll channel!`
            });
        }
        const bet = interaction.options.getInteger("bet");
        if (bet > profileData.balance) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: `You don't have enough rubles to bet ₽${bet.toLocaleString()}. You only have ₽${profileData.balance.toLocaleString()}`
            });
        }

        const roll = Math.floor(Math.random() * 100) + 1;
        const nickname = interaction.member?.nickname;
        const username = nickname || interaction.user.globalName || interaction.user.username;

        if (roll === 100) {
            profileData.balance += Math.floor(bet * 1.5);
            return interaction.reply(`🎲 ${username} rolled a **${roll}**!!! +₽${Math.floor(bet * 1.5).toLocaleString()}`);
        }


        resultString = (roll >= 55) ? `You win! +₽${bet.toLocaleString()}` : `You lose... -₽${bet.toLocaleString()}`;
        interaction.reply(`🎲 ${username} bets ₽${bet.toLocaleString()}. You rolled a **${roll}**. ${resultString}`);

        (roll >= 55) ? profileData.balance += bet : profileData.balance -= bet;
        profileData.save();
    }
};