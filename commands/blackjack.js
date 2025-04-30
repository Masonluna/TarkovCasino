const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");


const activeBets = new Map();

module.exports = {
    // Max Bet: 1 Billion
    // Min Bet: 100,000
    data: new SlashCommandBuilder().setName("blackjack").setDescription("Play a hand of blackjack").addIntegerOption(
        (option) =>
            option
                .setName("bet")
                .setDescription("Choose the amount you want to bet (Range: ")
                .setMaxValue(1000000000)
                .setMinValue(1000000)
                .setRequired(true)
    ),

    async execute(interaction, profileData) {
        const { id } = interaction.user;
        const { balance } = profileData;
        const nickname = interaction.member?.nickname;
        const username = nickname || interaction.user.globalName || interaction.user.username;

        if (activeBets.has(id)) {
            return interaction.reply(`You already have a game in progress! Finish it before starting a new one.`);
        }

        activeBets.set(id, interaction.options.getInteger("amount"));
        try {
            if (!isValidBet(activeBets.get(id), balance)) {
                await interaction.deferReply({ ephemeral: true });
                return await interaction.editReply(`You don't have ${activeBets.get(id)} rubles to bet with`);
            } else {
                // Take their money out of the balance first to avoid exploitation
                profileData.balance -= activeBets.get(id);
                await profileData.save();
            }

            await interaction.deferReply();

            // Init Deck
            const suits = ["♠", "♥", "♦", "♣"];
            const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

            let deck = [];
            let playerHand = [];
            let dealerHand = [];

            for (let suit of suits) {
                for (let rank of ranks) {
                    deck.push({ rank, suit });
                }
            }
            shuffleDeck(deck);

            playerHand.push(deck.pop(), deck.pop());
            dealerHand.push(deck.pop(), deck.pop());

            if (getHandValue(playerHand) === 21) {
                if (getHandValue(dealerHand) === 21) {
                    profileData.balance += activeBets.get(id);
                    await profileData.save();
                    const gameEmbed = new EmbedBuilder()
                        .setColor(0xebeb55)
                        .setTitle(`${username}, your Blackjack game!`)
                        .setDescription(`
                            Your hand: ${displayHand(playerHand)}\n
                            Dealer's hand: ${displayHand(dealerHand, true, true)}\n\n
                            Double Natural Blackjack! Tie    
                        `)
                        .setFooter({ text: `Your updated wallet: ${profileData.balance.toLocaleString}` });

                    return await interaction.editReply({ embeds: [gameEmbed] });
                } else {
                    let payout = Math.round(activeBets.get(id) * 1.5);
                    profileData.balance += Math.round(activeBets.get(id) * 2.5);
                    await profileData.save();
                    const gameEmbed = new EmbedBuilder()
                        .setColor(0x00aa6d)
                        .setTitle(`${username}, your Blackjack game!`)
                        .setDescription(`
                            Your hane: ${displayHand(playerHand)}\n
                            Dealer's hand: ${displayHand(dealerHand, true, true)}\n\n
                            Natural Blackjack! You win! +${payout.toLocaleString()} rubles.
                        `)
                        .setFooter({ text: `Your updated wallet: ${profileData.balance.toLocaleString()} rubles` });

                    return await interaction.editReply({ embeds: [gameEmbed] });
                }
            } else if (getHandValue(dealerHand) === 21) {
                const gameEmbed = new EmbedBuilder()
                    .setColor(0xdd1111)
                    .setTitle(`${username}, your Blackjack game!`)
                    .setDescription(`
                        Your hand: ${displayHand(playerHand)}\n
                        Dealer's Hand: ${displayHand(dealerHand, true, true)}\n\n
                        Dealer Natural Blackjack! You lose! -${activeBets.get(id).toLocaleString()} rubles.
                    `)
                    .setFooter({ text: `Your updated wallet: ${profileData.balance.toLocaleString()}` });

                return await interaction.editReply({ embeds: [gameEmbed] });
            }

            // Determine possible actions
            let canSplit = playerHand[0].rank === playerHand[1].rank;
            let finalHand0;
            let finalHand1 = null;
            let finalHand2 = null;
            let canDoubleDown = true;

            finalHand0 = await playerHand(username, playerHand, dealerHand, deck, canSplit, canDoubleDown, interaction, profileData, "Main");

            // If split
            if (finalHand0 === "split") {
                finalHand1 = await playHand(username, [playerHand[0], deck.pop()], dealerHand, deck, false, false, interaction, profileData, "1");
                finalHand2 = await playHand(username, [playerHand[1], deck.pop()], dealerHand, deck, false, false, interaction, profileData, "2");
            }

            dealerHand = await dealerPlay(dealerHand, deck);
            let payout = 0;
            let results = [];
            results.push(determineResult(finalHand0, dealerHand));
            results.push(determineResult(finalHand1, dealerHand));
            results.push(determineResult(finalHand2, dealerHand));

            // Dole out pay
            for (i = 0; i < results.length; i++) {
                if (results[i] === "none") {
                    continue;
                }

                if (results[i] === "win") {
                    profileData.balance += activeBets.get(id) * 2;
                    payout += activeBets.get(id);
                    await profileData.save();
                }

                if (results[i] === "tie") {
                    profileData.balance += activeBets.get(id);
                    await profileData.save();
                }

                if (results[i] === "lose") {
                    payout -= activeBets.get(id);
                }
            }

            displayResults(finalHand0, finalHand1, finalHand2, dealerHand, results, profileData, interaction, payout);

        } finally {
            activeBets.delete(id);
        }
    }



}

async function playHand(playerName, playerHand, dealerHand, deck, canSplit, canDoubleDown, interaction, profileData, handLabel) {

    let description = "";
    if (handLabel === "Main") {
        description = `Your hand: ${displayHand(playerHand)}\n
      Dealer's hand: ${displayHand(dealerHand, true)}\n\n
      What would you like to do?`
    } else {
        description = `Your hand: ${displayHand(playerHand)}\n
      Dealer's hand: ${displayHand(dealerHand, true)}\n\n
      What would you like to do on Hand ${handLabel}?`
    }

    const gameEmbed = new EmbedBuilder()
        .setColor(0x3d85c6)
        .setTitle(`${playerName}, your Blackjack game!`)
        .setDescription(description);

    let row = createActionRow(canSplit, canDoubleDown);

    await interaction.editReply({ embeds: [gameEmbed], components: [row] });

    return new Promise((resolve, reject) => {
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 90000,
        });
        // Set up collector
        collector.on("collect", async (buttonInteraction) => {
            const buttonId = buttonInteraction.customId;
            // Handle Hit
            if (buttonId === "hit") {
                row = createActionRow(false, false);
                playerHand.push(deck.pop());
                if (getHandValue(playerHand) <= 21) {
                    gameEmbed.setDescription(
                        `Your hand: ${displayHand(playerHand)}\n
                        Dealer's hand: ${displayHand(dealerHand, true)}\n\n
                        What would you like to do on Hand ${handLabel}?`
                    );
                    await buttonInteraction.update({
                        embeds: [gameEmbed],
                        components: [row],
                    });
                } else {
                    await buttonInteraction.update({ // Ensure the interaction is acknowledged here too
                        embeds: [gameEmbed],
                        components: [],
                    });
                    resolve(playerHand);
                    collector.stop();
                }
            }
            // Handle Stand
            if (buttonId === "stand") {
                await buttonInteraction.update({ // Ensure the interaction is acknowledged here too
                    embeds: [gameEmbed],
                    components: [],
                });
                resolve(playerHand);
                collector.stop();
            }
            // Handle Split
            if (buttonId === "split") {
                profileData.balance -= bet;
                await profileData.save();
                await buttonInteraction.update({ // Ensure the interaction is acknowledged here too
                    embeds: [gameEmbed],
                    components: [],
                });
                resolve("split");
                collector.stop();
            }
            // Handle Double Down
            if (buttonId === "double down") {
                await buttonInteraction.update({ // Ensure the interaction is acknowledged here too
                    embeds: [gameEmbed],
                    components: [],
                });
                profileData.balance -= bet;
                await profileData.save();
                bet *= 2;
                playerHand.push(deck.pop());
                resolve(playerHand);
                collector.stop();
            }
        });

        collector.on("end", (_, reason) => {
            if (reason !== "collect") {
                reject(new Error("User did not respond in time"));
            }
        });
    });
}

async function dealerPlay(dealerHand, deck) {
    let dealerTotal = getHandValue(dealerHand);
    while (dealerTotal < 17) {
        dealerHand.push(deck.pop());
        dealerTotal = getHandValue(dealerHand);
    }
    return dealerHand;
}


function determineResult(playerHand, dealerHand) {
    if (playerHand === "split") {
        return "none";
    }
    if (playerHand && dealerHand) {
        const playerValue = getHandValue(playerHand);
        const dealerValue = getHandValue(dealerHand);

        if (playerValue > 21) return dealerValue > 21 ? "tie" : "lose";
        if (dealerValue > 21 || playerValue > dealerValue) return "win";
        return dealerValue > playerValue ? "lose" : "tie";
    } else {
        return "none";
    }
}

function displayResults(finalHand0, finalHand1, finalHand2, dealerHand, results, profileData, interaction, payout) {
    const { username, id } = interaction.user;

    let embedColor = 0x3d85c6;

    if (payout > 0) {
        payout = `+${payout.toLocaleString()} rubles.`;
        embedColor = 0x00aa6d;
    } else if (payout === 0) {
        payout = "";
        embedColor = 0xebeb55;
    } else {
        payout = `${payout.toLocaleString()} rubles.`;
        embedColor = 0xdd1111;
    }

    if (finalHand0 !== "split") {
        let gameEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${username}, your Blackjack game`)
            .setDescription(`
                Your hand: ${displayHand(finalHand0)}\n
                Dealer's hand: ${displayHand(dealerHand, true, true)}\n\n

                You ${results[0]}! ${payout}
                `)
            .setFooter({ text: `Your updated wallet: ${profileData.balance}` });

        interaction.editReply({ embeds: [gameEmbed], components: [] });
    } else {
        let gameEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${username}, your Blackjack game`)
            .setDescription(`
                Your first hand: ${displayHand(finalHand1)}\n
                Your second hand: ${displayHand(finalHand2)}\n
                Dealer's hand: ${displayHand(dealerHand, true, true)}\n\n

                You ${results[1]} hand one!\n
                You ${results[2]} hand two!\n
                Payout: ${payout}
                `)
            .setFooter({ text: `Your updated wallet: ${profileData.balance}` });

        interaction.editReply({ embeds: [gameEmbed], components: [] });
    }
}


function displayHand(hand, isDealer = false, gameFinished = false) {
    const handString = hand.map((card) => `${card.rank}${card.suit}`).join(" ");
    if (!isDealer) {
        return `${handString} (Total: ${getHandValue(hand)})`;
    } else if (!gameFinished) {
        return `??? ${hand[1].rank}${hand[1].suit}`; // Dealer's hand, concealed
    } else {
        return `${handString} (Total: ${getHandValue(hand)})`; // Dealer's hand, once game is finished.
    }
}

function getHandValue(hand) {
    let value = 0;
    let aceCount = 0;
    for (const card of hand) {
        if (card.rank === "A") {
            aceCount += 1;
            value += 11;
        } else if (["K", "Q", "J"].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    }

    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount -= 1;
    }

    return value;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function isValidBet(bet, balance) {
    return bet <= balance;
}



function createActionRow(canSplit, canDoubleDown) {
    const hitButton = createButton("hit", "Hit", "Primary");
    const standButton = createButton("stand", "Stand", "Success");
    const splitButton = createButton("split", "Split", "Danger", !canSplit);
    const doubldDownButton = createButton("double down", "Double Down", "Secondary", !canDoubleDown);
    return new ActionRowBuilder().addComponents(
        hitButton,
        standButton,
        splitButton,
        doubldDownButton
    );
}


function createButton(customId, label, style, disabled = false) {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style)
        .setDisabled(disabled);
}