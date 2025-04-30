const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("highroll")
        .setDescription("Roll a number from 1-100. Win on a 55 or more.")
        .addIntegerOption(
            (option) =>
                option
                    .setName("bet")
                    .setDescription("Choose the amount you want to bet")
                    .setRequired(true)
        ),

    async execute(interaction, profileData) {
        if (interaction.channel.name !== "high-roll") {
            return interaction.reply({
                flags: MessageFlags.Ephemral,
                content: `High Roll can only be played in the highroll channel!`
            });
        }
        const bet = interaction.options.getInteger("bet");
        const roll = Math.floor(Math.random() * 101);

        resultString = (roll >= 55) ? `You win! +${bet} rubles` : `You lose... -${bet} rubles`;
        interaction.reply(`You rolled a ${roll}. ${resultString}`);

        (roll >= 55) ? profileData.balance += bet : profileData.balance -= bet;
        profileData.save();
    }
};