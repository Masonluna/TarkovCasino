const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const profileModel = require("../models/profileSchema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Access to all the admin commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add rubles to a user's wallet")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you want to add rubles to")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("amount")
                        .setDescription("The amount of rubles to add")
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("subtract")
                .setDescription("Subtract rubles from a user's wallet")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you want to subtract rubles from")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("amount")
                        .setDescription("The amount of rubles to subtract")
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const adminSubcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        const nickname = user.nickname;
        const username = nickname || user.globalName || user.username

        // Get the user's profile data from the database
        const profileData = await profileModel.findOne({ userId: user.id });

        if (!profileData) {
            return await interaction.editReply(
                `No profile found for ${user.globalName}.`
            );
        }

        const currentBalance = profileData.balance;

        if (adminSubcommand === "add") {
            // Adding rubles to the user's balance
            await profileModel.findOneAndUpdate(
                { userId: user.id },
                { $inc: { balance: amount } }
            );

            const updatedProfile = await profileModel.findOne({ userId: user.id });
            const updatedBalance = updatedProfile.balance;

            // Mentioning the user and replying with the updated balance
            await interaction.editReply(
                `₽${amount} have been added to ${username}'s balance. New wallet: **₽${updatedBalance.toLocaleString()}**.`
            );
        }

        if (adminSubcommand === "subtract") {
            // Check if the user has enough rubles to subtract
            if (currentBalance < amount) {
                return await interaction.editReply(
                    `${username} does not have enough rubles to subtract ₽${amount}. Current wallet: **₽${currentBalance.toLocaleString()}**.`
                );
            }

            // Subtracting rubles from the user's balance
            await profileModel.findOneAndUpdate(
                { userId: user.id },
                { $inc: { balance: -amount } }
            );

            const updatedProfile = await profileModel.findOne({ userId: user.id });
            const updatedBalance = updatedProfile.balance;

            // Mentioning the user and replying with the updated balance
            await interaction.editReply(
                `₽${amount} have been removed from ${username}'s balance. New wallet: **₽${updatedBalance.toLocaleString()}**.`
            );
        }
    },
};
