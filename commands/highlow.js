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
                flags: MessageFlags.Ephemral,
                content: `High-Low can only be played in the high-low channel!`
            });
        }
        if (activeBets.get(id)) {
            return interaction.reply({
                flags: MessageFlags.Ephemral,
                content: `You already have an active game!`
            });
        }

        if (interaction.options.getInteger("bet") > profileData.balance) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: `You don't have enough rubles to bet ₽${interaction.options.getInteger("bet").toLocaleString()}. You only have ₽${profileData.balance.toLocaleString()}`
            });
        }


        activeBets.set(id, interaction.options.getInteger("bet"));
        const roll = Math.floor(Math.random() * 43);

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

            const roll2 = Math.floor(Math.random() * 43);
            return new Promise((resolve, reject) => {
                // Collector
                const filter = (i) => i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 90000
                });
                collector.on("collect", async (buttonInteraction) => {
                    const buttonId = buttonInteraction.customId;
                    await interaction.editReply({
                        components: []
                    });
                    if ((buttonId === "guess_higher" && roll2 > roll) || (buttonId === "guess_lower" && roll2 < roll)) {
                        profileData.balance += activeBets.get(id);
                        await interaction.followUp({
                            content: `🎲 The dealer rolled **${roll2}**. You win! +₽${activeBets.get(id)}`
                        });
                    } else {
                        profileData.balance -= activeBets.get(id);
                        await interaction.followUp({
                            content: `🎲 The dealer rolled **${roll2}**. You lose! -₽${activeBets.get(id)}`
                        });
                    }

                    activeBets.delete(id);
                    resolve();
                });

                collector.on("end", (_, reason) => {
                    if (reason !== "collect") {
                        interaction.editReply({
                            content: `You took too long to respond! Ending game...`,
                        }).catch(console.error);
                        activeBets.delete(id);

                        reject(new Error("User did not respond in time"));
                    }
                });

            });
        }
    }
};