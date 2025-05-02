const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const parseMilliseconds = require("parse-ms-2");
const profileModel = require("../models/profileSchema");
const { dailyMin, dailyMax } = require("../globalValues.json")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Get your daily reward!"),
    async execute(interaction, profileData) {
        if (interaction.channel.name !== "daily") {
            return interaction.reply({
                flags: MessageFlags.Ephemral,
                content: `Your daily reward must be redeemed in the daily channel!`
            });
        }
        const { id } = interaction.user;
        const { dailyLastUsed } = profileData;

        const cooldown = 86400000;
        const timeLeft = cooldown - (Date.now() - dailyLastUsed);

        if (timeLeft > 0) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral })
            const { hours, minutes, seconds } = parseMilliseconds(timeLeft);
            await interaction.editReply(`Claim your next daily in ${hours} hrs ${minutes} min ${seconds} sec`);
            return;
        }

        await interaction.deferReply();
        const random = Math.floor(Math.random() * (dailyMax - dailyMin) + dailyMin);

        try {
            await profileModel.findOneAndUpdate(
                { userId: id },
                {
                    $set: {
                        dailyLastUsed: Date.now(),
                    },
                    $inc: {
                        balance: random
                    }
                }
            );
        } catch (err) {
            console.log(err);
        }

        await interaction.editReply(`You redeemed ${random} rubles! Updated wallet: ${profileData.balance}`);
    }
};