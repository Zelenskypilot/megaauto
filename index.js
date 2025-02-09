const { Telegraf } = require('telegraf');
const mysql = require('mysql2');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Function to retrieve all user IDs from the database
function getAllUserIds(callback) {
    const query = 'SELECT user_id FROM users';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error retrieving user IDs:', err);
            return callback([]);
        }
        const userIds = results.map(row => row.user_id);
        console.log('Retrieved user IDs:', userIds); // Debugging
        callback(userIds);
    });
}

// Listen for new messages in the channel
bot.on('channel_post', async (ctx) => {
    const message = ctx.update.channel_post;

    // Debugging: Log the message
    console.log('New channel post:', message);

    // Retrieve all user IDs from the database
    getAllUserIds((userIds) => {
        if (userIds.length === 0) {
            console.log('No users found in the database.');
            return;
        }

        // Exclude the bot's own user ID from the list
        const botUserId = ctx.botInfo.id; // Get the bot's user ID
        const filteredUserIds = userIds.filter(userId => userId !== botUserId);

        if (filteredUserIds.length === 0) {
            console.log('No valid users found after filtering.');
            return;
        }

        // Forward the message to each user
        filteredUserIds.forEach((userId) => {
            try {
                ctx.telegram.forwardMessage(userId, message.chat.id, message.message_id)
                    .then(() => {
                        console.log(`Message forwarded to user ${userId}`);
                    })
                    .catch((err) => {
                        console.error(`Failed to forward message to user ${userId}:`, err);
                    });
            } catch (err) {
                console.error(`Error forwarding message to user ${userId}:`, err);
            }
        });
    });
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Error:', err);
    ctx.reply('An error occurred.');
});

// Launch the bot
bot.launch();
console.log('Forwarding bot is running!');