const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const activeBets = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("highlow")
        .setDescription("Guess if the next roll is higher or lower!")
        .addIntegerOption(
            (option) =>
                option
                    .setName("bet")
                    .setDescription("Choose the amount you want to bet")
                    .setRequired(true)
        ),

    async execute(interaction, profileData) {
        const { id } = interaction.user;
        if (interaction.channel.name !== "high-low") {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: `High-Low can only be played in the high-low channel!`
            });
        }
        if (activeBets.get(id)) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: `You already have an active game!`
            });
        }

        const betAmount = interaction.options.getInteger("bet");

        if (betAmount > profileData.balance) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: `You don't have enough rubles to bet ₽${betAmount.toLocaleString()}. You only have ₽${profileData.balance.toLocaleString()}`
            });
        }

        activeBets.set(id, betAmount);

        try {
            const roll = Math.floor(Math.random() * 42) + 1;

            if (roll === 21) {
                profileData.balance -= activeBets.get(id);
                await profileData.save();
                await interaction.reply({
                    content: `🎲 Dealer rolls **21**, automatic loss! -₽${activeBets.get(id)}.`
                });
                activeBets.delete(id);
            } else {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`guess_higher`)
                            .setLabel(`High`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`guess_lower`)
                            .setLabel(`Low`)
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.reply({
                    content: `🎲 The dealer rolled **${roll}**. Will the next number be higher or lower?`,
                    components: [row],
                });
                const message = await interaction.fetchReply();

                const collector = message.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id,
                    time: 90000,
                    max: 1
                });

                collector.on('collect', async (buttonInteraction) => {
                    const roll2 = Math.floor(Math.random() * 42) + 1;
                    const userChoice = buttonInteraction.customId.replace('guess_', '');

                    await buttonInteraction.update({
                        content: `🎲 The dealer rolled **${roll}**. You chose ${userChoice}...`,
                        components: []
                    });

                    let resultMessage;
                    if ((buttonInteraction.customId === "guess_higher" && roll2 > roll) ||
                        (buttonInteraction.customId === "guess_lower" && roll2 < roll)) {
                        // Win
                        profileData.balance += betAmount;
                        resultMessage = `🎲 The dealer rolled **${roll2}**. You win! +₽${betAmount.toLocaleString()}`;
                    } else if (roll2 === roll) {
                        // Tie
                        resultMessage = `🎲 The dealer rolled **${roll2}**. It's a tie! Your bet is returned.`;
                    } else {
                        // Loss
                        profileData.balance -= betAmount;
                        resultMessage = `🎲 The dealer rolled **${roll2}**. You lose! -₽${betAmount.toLocaleString()}`;
                    }

                    await profileData.save();
                    await interaction.followUp({ content: resultMessage });
                    activeBets.delete(id);
                });

                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await interaction.editReply({
                            content: `You took too long to respond! Ending game...`,
                            components: []
                        });
                        activeBets.delete(id);
                    }
                });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral
            });
            activeBets.delete(id);
        }
    }
};