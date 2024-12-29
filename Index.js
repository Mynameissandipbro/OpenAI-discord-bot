require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Initialize OpenAI API
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

let isChatActive = false;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Slash command registration
(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // Add your bot's client ID in the .env file
      {
        body: [
          {
            name: 'start_chat',
            description: 'Bot will start replying to every message',
          },
          {
            name: 'deactivate',
            description: 'Stop the bot from replying to every message',
          },
          {
            name: 'imagine',
            description: 'Generate an image from a prompt',
            options: [
              {
                name: 'prompt',
                description: 'Describe the image you want',
                type: 3, // String
                required: true,
              },
              {
                name: 'type',
                description: 'Choose a style for the image',
                type: 3, // String
                required: true,
                choices: [
                  { name: 'Realistic', value: 'realistic' },
                  { name: 'Drawn', value: 'drawn' },
                  { name: 'Anime', value: 'anime' },
                  { name: 'Toony', value: 'toony' },
                ],
              },
              {
                name: 'scale',
                description: 'Choose a scale for the image',
                type: 3, // String
                required: true,
                choices: [
                  { name: 'Thumbnail (256x256)', value: 'thumbnail' },
                  { name: 'Square (512x512)', value: 'square' },
                  { name: 'Phone Screen (1024x1792)', value: 'phone_screen' },
                ],
              },
            ],
          },
        ],
      }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

// Slash command interaction
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'start_chat') {
    isChatActive = true;
    await interaction.reply('Chat mode activated! The bot will reply to every message.');
  }

  if (commandName === 'deactivate') {
    isChatActive = false;
    await interaction.reply('Chat mode deactivated! The bot will stop replying to every message.');
  }

  if (commandName === 'imagine') {
    const prompt = options.getString('prompt');
    const type = options.getString('type');
    const scale = options.getString('scale');

    const style = {
      realistic: 'photo-realistic',
      drawn: 'hand-drawn style',
      anime: 'anime style',
      toony: 'cartoon style',
    }[type];

    const size = {
      thumbnail: '256x256',
      square: '512x512',
      phone_screen: '1024x1792',
    }[scale];

    try {
      const response = await openai.createImage({
        prompt: `${prompt} in ${style}`,
        n: 1,
        size: size,
      });

      const imageUrl = response.data.data[0].url;
      await interaction.reply({ content: `Here is your image: ${imageUrl}`, ephemeral: false });
    } catch (error) {
      console.error(error);
      await interaction.reply('Failed to generate the image. Please try again later.');
    }
  }
});

// Message listener for chat mode
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (isChatActive || message.mentions.has(client.user)) {
    try {
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message.content }],
      });

      const reply = response.data.choices[0].message.content;
      message.reply(reply);
    } catch (error) {
      console.error(error);
      message.reply('Sorry, I encountered an error while processing your message.');
    }
  }
});

// Log in the bot
client.login(process.env.DISCORD_TOKEN);
