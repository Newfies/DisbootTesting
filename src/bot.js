// Packages and Requires
const dotenv = require("dotenv").config();
const fs = require('fs');
const { exec } = require("child_process");
const pm2 = require("pm2");
const chalk = require("chalk");
const https = require("https");
const { Client, Events, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, PermissionsBitField, 
        Permissions, Embed, Activity, ActivityType, ButtonBuilder, ButtonStyle, ActionRowBuilder, } = require("discord.js");
const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, ], });

// Script Variables
const TOKEN = process.env.TOKEN;

// Custom Functions
// Timestamp System
function getTimestamp() {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Logging System
function log(LOG, CODE) {
  if (CODE == 1) {
    console.log(
      "[ " + chalk.white("LOG") + " @ " + getTimestamp() + "] | " + LOG
    );
  } // For Regular Logging
  if (CODE == 2) {
    console.log(
      "[ " + chalk.yellow("WARNING") + " @ " + getTimestamp() + "] | " + LOG
    );
  } // For Warning Logging
  if (CODE == 3) {
    console.log(
      "[ " + chalk.red("ERROR") + " @ " + getTimestamp() + "] | " + LOG
    );
  } // For Error Logging
  if (CODE == 4) {
    console.log(
      "[ " + chalk.blue("SERVER") + " @ " + getTimestamp() + "] | " + LOG
    );
  } // For Logging Changes To Discord Server
}

// SlashCommandBuilder
function SCB(name, desc) {
  return new SlashCommandBuilder().setName(name).setDescription(desc);
}

// Client Slash Command Makers
const ping = SCB("ping", "Simple ping command!");
const ban = SCB("ban", "This starts banning the users");
const add = new SlashCommandBuilder()
  .setName("add")
  .setDescription("This adds a specified user to the bans.json file.")
  .addStringOption(option =>
    option.setName("reason")
      .setDescription("Why are they being banned?")
      .setRequired(true))
  .addUserOption(option =>
    option.setName("user")
      .setDescription("Pick a user from the server (optional)")
      .setRequired(false))
  .addStringOption(option =>
    option.setName("userid")
      .setDescription("Manually enter a user ID (optional)")
      .setRequired(false));
const report = SCB("report", "Report a user to be added to Disboot");

// Client.On's
// Ready
client.on("ready", async () => {
  log(`${client.user.tag} is now running!`, 1);

  // Client Slash Command Creators
  await client.application.commands.create(ping); // Command for /ping
  log(`/ping command registered`, 1);

  await client.application.commands.create(ban); // Command for /ban
  log(`/ban command registered`, 1);

  await client.application.commands.create(add); // Command for /add
  log(`/add command registered`, 1);

  await client.application.commands.create(report); // Command for /report
  log(`/report command registered`, 1);

  // Set bot activity status
  client.user.setActivity({
    name: `Banning Bad Accounts With Disboot`,
    type: ActivityType.Watching,
  });
});

// Sleep Function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to fetch ban list
function fetchBanList() {
  return new Promise((resolve, reject) => {
    https
      .get(
        "https://raw.githubusercontent.com/Newfies/DisbootTesting/refs/heads/main/bans.json", // My fuggin epic "database"
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error("Failed to parse JSON."));
            }
          });
        }
      )
      .on("error", (err) => reject(err));
  });
}

// interactionCreate
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "ping") {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Pong!",
        ephemeral: true,
      });
    }
  }

  if (interaction.commandName === "ban") {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral: true });
      try {
        const banList = await fetchBanList();
        for (const entry of banList) {
          const userId = entry.userId;
          const reason = entry.reason;

          try {
            await interaction.guild.members.ban(userId, { reason });
            log(`Banned ${userId} for "${reason}"`, 1);
          } catch (err) {
            log(`Failed to ban ${userId}: ${err.message}`, 3);
          }

          await sleep(1500);
        }
        await interaction.editReply({ content: `Ban process complete.` });
        log(`Ban process complete`, 1)
      } catch (err) {
        await interaction.editReply({
          content: `Failed to fetch ban list: ${err.message}`,
        });
        log(`Failed to fetch or process ban list: ${err}`, 3);
      }
    }
  }

if (interaction.commandName === "add") {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral: true });

      const userOption = interaction.options.getUser("user");
      const userIdOption = interaction.options.getString("userid");
      const reason = interaction.options.getString("reason");

      let finalUserId = null;

      if (userOption) {
        finalUserId = userOption.id;
      } else if (userIdOption) {
        finalUserId = userIdOption;
      } else {
        await interaction.editReply({
          content: "Error: You must provide either a user or a user ID.",
        });
        return;
      }

      const newEntry = {
        userId: finalUserId,
        reason: reason
      };

      try {
        const data = fs.readFileSync("bans.json", "utf8");
        const json = JSON.parse(data);
        json.push(newEntry);
        fs.writeFileSync("bans.json", JSON.stringify(json, null, 2));
        log(`Added ${finalUserId} to bans.json with reason: ${reason}`, 1);
        await interaction.editReply({
          content: `Successfully added user ID \`${finalUserId}\` to bans.json.`,
        });
      } catch (err) {
        log(`Failed to update bans.json: ${err.message}`, 3);
        await interaction.editReply({
          content: `Failed to update bans.json: ${err.message}`,
        });
      }
    }
  }

  if (interaction.commandName === "report") {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "To report a user, please head to [The GitHub Issue Page](https://github.com/Newfies/Disboot/issues/new?title=ENTER%20USER%20ID(S)%20HERE&body=EXPLAIN%20WHAT%20THE%20USER%20DID,%20AND%20PROVIDE%20PROOF&labels=Report)",
        ephemeral: true,
      });
    }
  }
});

// Login To Bot
client.login(TOKEN);
