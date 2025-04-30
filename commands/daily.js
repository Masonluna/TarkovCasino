const { SlashCommandBuilder } = require("discord.js");
const parseMilliseconds = require("parse-ms-2");
const profileModel = require("../models/profileSchema");
const { dailyMin, dailyMax } = require("../globalValues.json")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Get your daily reward!"),
    async execute(interaction, profileData) {
        const { id } = interaction.user;
        const { dailyLastUsed } = profileData;

        const cooldown = 86400000;
        const timeLeft = cooldown - (Date.now() - dailyLastUsed);

        if (timeLeft > 0) {
            await interaction.deferReply({ ephemeral: true })
            const { hours, miniutes, seconds } = parseMilliseconds(timeLeft);
            await interaction.editReply(`Clain your next daily in ${hours} hrs ${minutes} min ${seconds} sec`);
        }

        await interaction.deferReply();
        const random = Math.floor(Math.random() * (dailyMax - dailyMin) + dailyMin);

        try {
            await profileModell.findOneAndUpdate(
                { userID: id },
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

        await interaction.editReply(`You redeemed ${random} rubles!`)
    }
};