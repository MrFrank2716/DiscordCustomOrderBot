const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Order queue storage (in production, consider using a database)
const orderQueue = new Map();
const orderHistory = new Map();
const orderReviews = new Map(); // Maps order codes to reviews
const orderDependencies = new Map(); // Maps order codes to their dependencies
const orderDueDates = new Map(); // Maps order codes to due dates

// Promotional token system
const promotionalTokens = new Map(); // Maps token codes to token data

// Order numbering system
let currentOrderNumber = 1; // Linear order numbering starting from 1

const orderStatistics = {
    totalCreated: 0,
    totalCompleted: 0,
    averageCompletionTime: 0,
    completionTimesByPriority: {
        'low': [],
        'normal': [],
        'high': [],
        'urgent': []
    }
};

// Temporary storage for order creation process
const pendingOrders = new Map();

// Data persistence configuration
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const STATS_FILE = path.join(DATA_DIR, 'statistics.json');
const DEPENDENCIES_FILE = path.join(DATA_DIR, 'dependencies.json');
const DUE_DATES_FILE = path.join(DATA_DIR, 'due_dates.json');
const ORDER_COUNTER_FILE = path.join(DATA_DIR, 'order_counter.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

// Email configuration for printer
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Data persistence functions
function saveOrderData() {
    try {
        // Convert Maps to Objects for JSON storage
        const ordersObject = Object.fromEntries(orderQueue);
        const historyObject = Object.fromEntries(orderHistory);
        const reviewsObject = Object.fromEntries(orderReviews);
        const dependenciesObject = Object.fromEntries(orderDependencies);
        const dueDatesObject = Object.fromEntries(orderDueDates);
        const tokensObject = Object.fromEntries(promotionalTokens);
        
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersObject, null, 2));
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyObject, null, 2));
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviewsObject, null, 2));
        fs.writeFileSync(STATS_FILE, JSON.stringify(orderStatistics, null, 2));
        fs.writeFileSync(DEPENDENCIES_FILE, JSON.stringify(dependenciesObject, null, 2));
        fs.writeFileSync(DUE_DATES_FILE, JSON.stringify(dueDatesObject, null, 2));
        fs.writeFileSync(ORDER_COUNTER_FILE, JSON.stringify({ currentOrderNumber }, null, 2));
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensObject, null, 2));
        
        console.log('✅ Order data saved successfully');
    } catch (error) {
        console.error('❌ Error saving order data:', error);
    }
}

function loadOrderData() {
    try {
        // Load order counter first
        if (fs.existsSync(ORDER_COUNTER_FILE)) {
            const counterData = JSON.parse(fs.readFileSync(ORDER_COUNTER_FILE, 'utf8'));
            currentOrderNumber = counterData.currentOrderNumber || 1;
            console.log(`🔢 Loaded order counter: Next order will be ED${currentOrderNumber.toString().padStart(3, '0')}`);
        }

        // Load orders
        if (fs.existsSync(ORDERS_FILE)) {
            const ordersData = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
            orderQueue.clear();
            for (const [key, value] of Object.entries(ordersData)) {
                orderQueue.set(key, value);
            }
            console.log(`📋 Loaded ${orderQueue.size} orders from storage`);
        }
        
        // Load history
        if (fs.existsSync(HISTORY_FILE)) {
            const historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            orderHistory.clear();
            for (const [key, value] of Object.entries(historyData)) {
                orderHistory.set(key, value);
            }
            console.log(`📚 Loaded ${orderHistory.size} completed orders from storage`);
        }

        // Load reviews
        if (fs.existsSync(REVIEWS_FILE)) {
            const reviewsData = JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8'));
            orderReviews.clear();
            for (const [key, value] of Object.entries(reviewsData)) {
                orderReviews.set(key, value);
            }
            console.log(`⭐ Loaded ${orderReviews.size} reviews from storage`);
        }
        
        // Load statistics
        if (fs.existsSync(STATS_FILE)) {
            const statsData = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
            Object.assign(orderStatistics, statsData);
            console.log(`📊 Loaded statistics from storage`);
        }
        
        // Load dependencies
        if (fs.existsSync(DEPENDENCIES_FILE)) {
            const dependenciesData = JSON.parse(fs.readFileSync(DEPENDENCIES_FILE, 'utf8'));
            orderDependencies.clear();
            for (const [key, value] of Object.entries(dependenciesData)) {
                orderDependencies.set(key, value);
            }
            console.log(`🔗 Loaded ${orderDependencies.size} order dependencies from storage`);
        }
        
        // Load due dates
        if (fs.existsSync(DUE_DATES_FILE)) {
            const dueDatesData = JSON.parse(fs.readFileSync(DUE_DATES_FILE, 'utf8'));
            orderDueDates.clear();
            for (const [key, value] of Object.entries(dueDatesData)) {
                orderDueDates.set(key, value);
            }
            console.log(`📅 Loaded ${orderDueDates.size} order due dates from storage`);
        }
        
        // Load promotional tokens
        if (fs.existsSync(TOKENS_FILE)) {
            const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
            promotionalTokens.clear();
            for (const [key, value] of Object.entries(tokensData)) {
                promotionalTokens.set(key, value);
            }
            console.log(`🎫 Loaded ${promotionalTokens.size} promotional tokens from storage`);
        }
        
        console.log('✅ All order data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading order data:', error);
        console.log('📝 Starting with empty data...');
    }
}

// Auto-save every 5 minutes
setInterval(() => {
    saveOrderData();
}, 5 * 60 * 1000);

// Save on process exit
process.on('SIGINT', () => {
    console.log('🛑 Bot shutting down, saving data...');
    saveOrderData();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Bot terminating, saving data...');
    saveOrderData();
    process.exit(0);
});

// Generate linear order code with ED prefix
function generateOrderCode() {
    const code = `ED${currentOrderNumber.toString().padStart(3, '0')}`;
    currentOrderNumber++;
    return code;
}

// Generate random 5-character token code (letters and numbers)
function generateTokenCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if token already exists, if so generate another
    if (promotionalTokens.has(result)) {
        return generateTokenCode();
    }
    
    return result;
}

// Check if token exists and is valid
function isValidToken(tokenCode) {
    const token = promotionalTokens.get(tokenCode.toUpperCase());
    return token && !token.used;
}

// Mark token as used
function markTokenAsUsed(tokenCode, orderCode, usedBy) {
    const token = promotionalTokens.get(tokenCode.toUpperCase());
    if (token && !token.used) {
        token.used = true;
        token.usedAt = Date.now();
        token.usedBy = usedBy;
        token.usedInOrder = orderCode;
        return true;
    }
    return false;
}

// Order status definitions
const ORDER_STATUSES = {
    'pending': { emoji: '⏳', name: 'Pending', description: 'Order received, waiting to start' },
    'preparing': { emoji: '📋', name: 'Preparing', description: 'Gathering materials and planning' },
    'manufacturing': { emoji: '🔨', name: 'Manufacturing', description: 'Currently being created' },
    'quality_check': { emoji: '🔍', name: 'Quality Check', description: 'Reviewing and testing' },
    'ready': { emoji: '📦', name: 'Ready for Delivery', description: 'Completed and ready for pickup/delivery' },
    'completed': { emoji: '✅', name: 'Completed', description: 'Order fulfilled and delivered' },
    'cancelled': { emoji: '❌', name: 'Cancelled', description: 'Order was cancelled' },
    'on_hold': { emoji: '⏸️', name: 'On Hold', description: 'Temporarily paused' }
};

// Priority definitions
const PRIORITIES = {
    'low': { emoji: '🟢', value: 1, name: 'Low' },
    'normal': { emoji: '🟡', value: 2, name: 'Normal' },
    'high': { emoji: '🟠', value: 3, name: 'High' },
    'urgent': { emoji: '🔴', value: 4, name: 'Urgent' }
};

// Bot ready event
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online and ready!`);
    console.log(`📊 Managing orders in ${client.guilds.cache.size} server(s)`);
    console.log(`🕐 Bot started at: ${new Date().toLocaleString()}`);
    
    // Load existing data
    loadOrderData();
    
    // Set bot status
    client.user.setActivity('Managing Orders | /queue', { type: 3 }); // 3 = WATCHING
});

// Handle reconnection
client.on('reconnecting', () => {
    console.log('🔄 Reconnecting to Discord...');
});

client.on('resume', () => {
    console.log('✅ Reconnected to Discord!');
});

// Helper function to check if user has admin permissions
function hasAdminPermissions(member) {
    // Check for server administrator permission first
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }
    
    // Check for specific admin role
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    if (adminRoleId && member.roles.cache.has(adminRoleId)) {
        return true;
    }
    
    // Check for staff role (alternative admin role)
    const staffRoleId = process.env.STAFF_ROLE_ID;
    if (staffRoleId && member.roles.cache.has(staffRoleId)) {
        return true;
    }
    
    return false;
}

// Slash command definitions
const commands = [
    // Create Order Command (now uses dropdown menus)
    new SlashCommandBuilder()
        .setName('createorder')
        .setDescription('Create a new order from a ticket')
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of the order')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('customer')
                .setDescription('The customer for this order')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('attachment')
                .setDescription('Attach a file/image to the order')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('token_code')
                .setDescription('Promotional token code (5 characters) - optional')
                .setRequired(false)),

    // Queue Command
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the current order queue'),

    // Complete Order Command
    new SlashCommandBuilder()
        .setName('complete')
        .setDescription('Mark an order as complete')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to complete')
                .setRequired(true)),

    // Update Order Status Command
    new SlashCommandBuilder()
        .setName('updatestatus')
        .setDescription('Update the status of an order')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to update')
                .setRequired(true)),

    // Find Order Command
    new SlashCommandBuilder()
        .setName('findorder')
        .setDescription('Get a direct link to an order\'s ticket thread')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code (e.g., ED001)')
                .setRequired(true)),

    // Check Position Command
    new SlashCommandBuilder()
        .setName('position')
        .setDescription('Check your position in the queue')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('Your order code (optional - will show all your orders if not provided)')
                .setRequired(false)),

    // Order Status Command
    new SlashCommandBuilder()
        .setName('orderstatus')
        .setDescription('Check the status of a specific order')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to check')
                .setRequired(true)),

    // My Orders Command
    new SlashCommandBuilder()
        .setName('myorders')
        .setDescription('View all your current orders'),

    // Remove Order Command (Admin only)
    new SlashCommandBuilder()
        .setName('removeorder')
        .setDescription('Remove an order from the queue (Admin only)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to remove')
                .setRequired(true)),

    // Move Order Command (Admin only)
    new SlashCommandBuilder()
        .setName('moveorder')
        .setDescription('Move an order to a specific position in the queue (Admin only)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to move')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('New position in queue (1 = first)')
                .setRequired(true)
                .setMinValue(1)),

    // Rush Order Command (Admin only)
    new SlashCommandBuilder()
        .setName('rush')
        .setDescription('Mark an order as urgent/expedited (Admin only)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to rush')
                .setRequired(true)),

    // Statistics Command
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View order queue statistics and metrics'),

    // Bulk Complete Command (Admin only)
    new SlashCommandBuilder()
        .setName('bulkcomplete')
        .setDescription('Complete multiple orders at once (Admin only)')
        .addStringOption(option =>
            option.setName('order_codes')
                .setDescription('Order codes separated by commas (e.g., ED001,ED002,ED003)')
                .setRequired(true)),

    // Set Due Date Command (Admin only)
    new SlashCommandBuilder()
        .setName('setduedate')
        .setDescription('Set a due date for an order (Admin only)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('due_date')
                .setDescription('Due date (YYYY-MM-DD format)')
                .setRequired(true)),

    // Add Dependencies Command (Admin only)
    new SlashCommandBuilder()
        .setName('adddependency')
        .setDescription('Add a dependency between orders (Admin only)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order that depends on another')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('depends_on')
                .setDescription('The order code it depends on')
                .setRequired(true)),

    // View Overdue Orders Command
    new SlashCommandBuilder()
        .setName('overdue')
        .setDescription('View orders that are overdue'),

    // Manual Data Save Command (Admin only)
    new SlashCommandBuilder()
        .setName('savedata')
        .setDescription('Manually save order data to files (Admin only)'),

    // Role Info Command (Admin only) - Helper to find role IDs
    new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Get role IDs for bot configuration (Admin only)'),

    // Review Command - For customers to review completed orders
    new SlashCommandBuilder()
        .setName('review')
        .setDescription('Leave a review for a completed order')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code you want to review')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('rating')
                .setDescription('Rating from 1-5 stars')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5))
        .addStringOption(option =>
            option.setName('comment')
                .setDescription('Your review comment')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Optional image to include with your review')
                .setRequired(false)),

    // Print Label Command (Admin only) - Send order label to printer
    new SlashCommandBuilder()
        .setName('printlabel')
        .setDescription('Generate and send an order label to the printer (Admin only)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to print a label for')
                .setRequired(true)),

    // Send Receipt Command (Admin only) - Email receipt to customer
    new SlashCommandBuilder()
        .setName('sendreceipt')
        .setDescription('Generate and email a receipt to the customer (Admin only)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to send a receipt for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('customer_email')
                .setDescription('Customer email address')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('subtotal')
                .setDescription('Order subtotal amount (optional)')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('tax')
                .setDescription('Tax/VAT amount (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('payment_method')
                .setDescription('Payment method used (optional)')
                .setRequired(false)),

    // Erase Order Command (Admin only) - Completely remove order from system
    new SlashCommandBuilder()
        .setName('eraseorder')
        .setDescription('Completely erase an order from the system (Admin only - USE WITH CAUTION)')
        .addStringOption(option =>
            option.setName('order_code')
                .setDescription('The order code to permanently erase')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for erasing this order (for logging purposes)')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('confirm')
                .setDescription('Type "true" to confirm permanent deletion')
                .setRequired(true)),

    // History Command (Admin only) - View all completed orders
    new SlashCommandBuilder()
        .setName('history')
        .setDescription('View all completed orders from the system history (Admin only)')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view (default: 1)')
                .setRequired(false)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('customer')
                .setDescription('Filter by customer (user ID or mention)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('priority')
                .setDescription('Filter by priority')
                .setRequired(false)
                .addChoices(
                    { name: 'Low', value: 'low' },
                    { name: 'Normal', value: 'normal' },
                    { name: 'High', value: 'high' },
                    { name: 'Urgent', value: 'urgent' }
                ))
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('Sort order for results')
                .setRequired(false)
                .addChoices(
                    { name: 'Newest First', value: 'newest' },
                    { name: 'Oldest First', value: 'oldest' },
                    { name: 'By Order Code', value: 'code' }
                )),

    // Generate Token Command (Admin only) - Create promotional tokens
    new SlashCommandBuilder()
        .setName('generatetoken')
        .setDescription('Generate a new promotional token (Admin only)')
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of what this token is for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Additional notes about this token (optional)')
                .setRequired(false)),

    // Check Token Command (Admin only) - Check token status
    new SlashCommandBuilder()
        .setName('checktoken')
        .setDescription('Check the status and details of a promotional token (Admin only)')
        .addStringOption(option =>
            option.setName('token_code')
                .setDescription('The 5-character token code to check')
                .setRequired(true)),

    // Remove Token Command (Admin only) - Remove token from system
    new SlashCommandBuilder()
        .setName('removetoken')
        .setDescription('Remove a promotional token from the system (Admin only)')
        .addStringOption(option =>
            option.setName('token_code')
                .setDescription('The 5-character token code to remove')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for removing this token')
                .setRequired(true)),

    // List Tokens Command (Admin only) - View all tokens
    new SlashCommandBuilder()
        .setName('listtokens')
        .setDescription('List all promotional tokens in the system (Admin only)')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Filter by token status')
                .setRequired(false)
                .addChoices(
                    { name: 'All Tokens', value: 'all' },
                    { name: 'Available', value: 'available' },
                    { name: 'Used', value: 'used' }
                ))
];

// Helper functions
function getPriorityEmoji(priority) {
    return PRIORITIES[priority]?.emoji || '⚪';
}

function getPriorityValue(priority) {
    return PRIORITIES[priority]?.value || 2;
}

function getStatusEmoji(status) {
    return ORDER_STATUSES[status]?.emoji || '⚪';
}

function getStatusName(status) {
    return ORDER_STATUSES[status]?.name || 'Unknown';
}

function sortOrdersByPriority(orders) {
    return orders.sort((a, b) => {
        if (getPriorityValue(b.priority) !== getPriorityValue(a.priority)) {
            return getPriorityValue(b.priority) - getPriorityValue(a.priority);
        }
        return a.createdAt - b.createdAt;
    });
}

function getOrderPosition(orderCode) {
    const orders = Array.from(orderQueue.values());
    const sortedOrders = sortOrdersByPriority(orders);
    return sortedOrders.findIndex(order => order.code === orderCode) + 1;
}

function createOrderCreationModal() {
    const prioritySelect = new StringSelectMenuBuilder()
        .setCustomId('priority_select')
        .setPlaceholder('Select order priority')
        .addOptions([
            {
                label: 'Low Priority',
                description: 'Standard processing time',
                value: 'low',
                emoji: '🟢'
            },
            {
                label: 'Normal Priority',
                description: 'Default priority level',
                value: 'normal',
                emoji: '🟡'
            },
            {
                label: 'High Priority',
                description: 'Expedited processing',
                value: 'high',
                emoji: '🟠'
            },
            {
                label: 'Urgent Priority',
                description: 'Rush order - immediate attention',
                value: 'urgent',
                emoji: '🔴'
            }
        ]);

    const statusSelect = new StringSelectMenuBuilder()
        .setCustomId('status_select')
        .setPlaceholder('Select initial order status')
        .addOptions([
            {
                label: 'Pending',
                description: 'Order received, waiting to start',
                value: 'pending',
                emoji: '⏳'
            },
            {
                label: 'Preparing',
                description: 'Gathering materials and planning',
                value: 'preparing',
                emoji: '📋'
            },
            {
                label: 'Manufacturing',
                description: 'Currently being created',
                value: 'manufacturing',
                emoji: '🔨'
            }
        ]);

    return [
        new ActionRowBuilder().addComponents(prioritySelect),
        new ActionRowBuilder().addComponents(statusSelect)
    ];
}

function getThreadLink(channelId, guildId) {
    return `https://discord.com/channels/${guildId}/${channelId}`;
}

async function logOrderAction(guild, action, order, user) {
    try {
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (!logChannelId) return;

        const logChannel = guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle(`Order ${action}`)
            .setColor(action === 'Created' ? 0x00ff00 : action === 'Completed' ? 0x0099ff : 0xff0000)
            .addFields(
                { name: 'Order Code', value: order.code.toString(), inline: true },
                { name: 'Customer', value: `<@${order.customerId}>`, inline: true },
                { name: 'Action by', value: `<@${user.id}>`, inline: true },
                { name: 'Status', value: `${getStatusEmoji(order.status)} ${getStatusName(order.status)}`, inline: true },
                { name: 'Priority', value: `${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name}`, inline: true },
                { name: 'Thread Link', value: `[Go to Ticket](${getThreadLink(order.channelId, guild.id)})`, inline: true },
                { name: 'Description', value: order.description.substring(0, 1024) }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging order action:', error);
    }
}

// New utility functions for advanced features

// Check if an order is overdue
function isOrderOverdue(orderCode) {
    const dueDate = orderDueDates.get(orderCode);
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
}

// Get all overdue orders
function getOverdueOrders() {
    return Array.from(orderQueue.values()).filter(order => isOrderOverdue(order.code));
}

// Calculate average completion time
function calculateAverageCompletionTime(priority = null) {
    if (priority) {
        const times = orderStatistics.completionTimesByPriority[priority];
        if (times.length === 0) return 0;
        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }
    return orderStatistics.averageCompletionTime;
}

// Update statistics when order is completed
function updateCompletionStatistics(order, completedAt) {
    const completionTime = completedAt - order.createdAt;
    orderStatistics.totalCompleted++;
    
    // Add to priority-specific tracking
    orderStatistics.completionTimesByPriority[order.priority].push(completionTime);
    
    // Recalculate overall average
    const allTimes = Object.values(orderStatistics.completionTimesByPriority).flat();
    if (allTimes.length > 0) {
        orderStatistics.averageCompletionTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
    }
}

// Move order to specific position
function moveOrderToPosition(orderCode, newPosition) {
    const order = orderQueue.get(orderCode);
    if (!order) return false;
    
    const orders = Array.from(orderQueue.values());
    const sortedOrders = sortOrdersByPriority(orders);
    
    // Find current position
    const currentIndex = sortedOrders.findIndex(o => o.code === orderCode);
    if (currentIndex === -1) return false;
    
    // Remove from current position
    sortedOrders.splice(currentIndex, 1);
    
    // Insert at new position (convert to 0-based index)
    const newIndex = Math.max(0, Math.min(newPosition - 1, sortedOrders.length));
    sortedOrders.splice(newIndex, 0, order);
    
    // Update priorities to maintain order
    sortedOrders.forEach((o, index) => {
        o.queuePosition = index;
    });
    
    return true;
}

// Check if order has dependencies that are not completed
function canCompleteOrder(orderCode) {
    const dependencies = orderDependencies.get(orderCode);
    if (!dependencies || dependencies.length === 0) return true;
    
    return dependencies.every(depCode => {
        return orderHistory.has(depCode) && orderHistory.get(depCode).status === 'completed';
    });
}

// Get orders that depend on a specific order
function getOrderDependents(orderCode) {
    const dependents = [];
    for (const [code, deps] of orderDependencies.entries()) {
        if (deps.includes(orderCode)) {
            dependents.push(code);
        }
    }
    return dependents;
}

// Format time duration in a readable way
function formatDuration(milliseconds) {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// Generate HTML label for printing
function generateOrderLabel(order) {
    const priorityColors = {
        'low': '#28a745',
        'normal': '#007bff', 
        'high': '#ffc107',
        'urgent': '#dc3545'
    };

    const statusColors = {
        'pending': '#6c757d',
        'preparing': '#17a2b8',
        'manufacturing': '#fd7e14',
        'quality_check': '#20c997',
        'ready': '#28a745',
        'shipped': '#6f42c1',
        'on_hold': '#ffc107',
        'cancelled': '#dc3545'
    };

    const createdDate = new Date(order.createdAt).toLocaleDateString();
    const dueDate = orderDueDates.get(order.code);
    const position = getOrderPosition(order.code);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: white;
        }
        .label {
            width: 4in;
            height: 6in;
            border: 2px solid #000;
            padding: 0.25in;
            box-sizing: border-box;
            page-break-after: always;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .order-code {
            font-size: 24px;
            font-weight: bold;
            margin: 5px 0;
        }
        .priority {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            font-size: 12px;
            background-color: ${priorityColors[order.priority] || '#6c757d'};
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            font-size: 12px;
            background-color: ${statusColors[order.status] || '#6c757d'};
            margin-left: 5px;
        }
        .info-row {
            margin: 8px 0;
            font-size: 11px;
        }
        .label-text {
            font-weight: bold;
            display: inline-block;
            width: 80px;
        }
        .description {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ccc;
            background-color: #f8f9fa;
            font-size: 10px;
            height: 120px;
            overflow: hidden;
        }
        .qr-placeholder {
            width: 80px;
            height: 80px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #666;
            float: right;
            margin-top: -100px;
        }
        .footer {
            position: absolute;
            bottom: 0.25in;
            left: 0.25in;
            right: 0.25in;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid #ccc;
            padding-top: 5px;
        }
    </style>
</head>
<body>
    <div class="label">
        <div class="header">
            <div class="order-code">${order.code}</div>
            <div>
                <span class="priority">${PRIORITIES[order.priority].name.toUpperCase()}</span>
                <span class="status">${getStatusName(order.status).toUpperCase()}</span>
            </div>
        </div>
        
        <div class="info-row">
            <span class="label-text">Customer:</span> ${order.customerTag}
        </div>
        <div class="info-row">
            <span class="label-text">Position:</span> #${position} in queue
        </div>
        <div class="info-row">
            <span class="label-text">Created:</span> ${createdDate}
        </div>
        ${dueDate ? `<div class="info-row"><span class="label-text">Due:</span> ${dueDate}</div>` : ''}
        <div class="info-row">
            <span class="label-text">Created by:</span> Staff
        </div>
        
        <div class="description">
            <strong>Description:</strong><br>
            ${order.description}
        </div>
        
        <div class="qr-placeholder">
            QR Code<br>
            ${order.code}
        </div>
        
        <div class="footer">
            Generated: ${new Date().toLocaleString()} | Order Management System
        </div>
    </div>
</body>
</html>`;
}

// Send label to printer via email
async function sendLabelToPrinter(order, interaction) {
    try {
        if (!process.env.PRINTER_EMAIL || !process.env.SMTP_USER) {
            throw new Error('Printer email configuration missing');
        }

        const labelHTML = generateOrderLabel(order);
        
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: process.env.PRINTER_EMAIL,
            subject: `Order Label - ${order.code}`,
            html: labelHTML,
            attachments: [{
                filename: `label-${order.code}.html`,
                content: labelHTML,
                contentType: 'text/html'
            }]
        };

        await emailTransporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending label to printer:', error);
        return false;
    }
}

// Generate HTML receipt for completed orders
function generateOrderReceipt(order, customerEmail, priceInfo = null) {
    const completedDate = new Date(order.completedAt).toLocaleDateString();
    const createdDate = new Date(order.createdAt).toLocaleDateString();
    const completionTime = formatDuration(order.completedAt - order.createdAt);
    
    // Calculate basic pricing if not provided
    const pricing = priceInfo || {
        subtotal: 0.00,
        tax: 0.00,
        total: 0.00,
        currency: 'GBP',
        paymentMethod: 'Paid in advance'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - Order ${order.code}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .receipt {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #ff0000ff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #ff0000ff;
            margin: 0;
        }
        .receipt-title {
            font-size: 24px;
            color: #333;
            margin: 10px 0 5px 0;
        }
        .order-code {
            font-size: 18px;
            color: #666;
            font-weight: bold; vb
        }
        .section {
            margin: 25px 0;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #ff0000ff;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 5px 0;
        }
        .info-label {
            font-weight: 600;
            color: #555;
        }
        .info-value {
            color: #333;
        }
        .description-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
            font-style: italic;
        }
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
        }
        .priority-low { background-color: #28a745; }
        .priority-normal { background-color: #007bff; }
        .priority-high { background-color: #ffc107; color: #333; }
        .priority-urgent { background-color: #dc3545; }
        .status-completed {
            color: #28a745;
            font-weight: bold;
        }
        .pricing-section {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .price-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
        }
        .total-row {
            border-top: 2px solid #ff0000ff;
            padding-top: 10px;
            margin-top: 15px;
            font-weight: bold;
            font-size: 18px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .thank-you {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
            margin: 20px 0;
        }
        .attachment-info {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h1 class="company-name">ExtruDough</h1>
            <h2 class="receipt-title">Order Receipt</h2>
            <div class="order-code">Order #${order.code}</div>
        </div>

        <div class="section">
            <div class="section-title">Order Information</div>
            <div class="info-row">
                <span class="info-label">Order Code:</span>
                <span class="info-value">${order.code}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Customer:</span>
                <span class="info-value">${order.customerTag}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Customer Email:</span>
                <span class="info-value">${customerEmail}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Priority:</span>
                <span class="priority-badge priority-${order.priority}">${PRIORITIES[order.priority].name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value status-completed">✅ Completed</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Timeline</div>
            <div class="info-row">
                <span class="info-label">Order Created:</span>
                <span class="info-value">${createdDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Order Completed:</span>
                <span class="info-value">${completedDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Processing Time:</span>
                <span class="info-value">${completionTime}</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Order Description</div>
            <div class="description-box">
                ${order.description}
            </div>
            ${order.attachment ? `
            <div class="attachment-info">
                <strong>📎 Attachment:</strong> ${order.attachment.name}
            </div>
            ` : ''}
        </div>

        ${pricing.total > 0 ? `
        <div class="section">
            <div class="section-title">Pricing Details</div>
            <div class="pricing-section">
                <div class="price-row">
                    <span>Subtotal:</span>
                    <span>£${pricing.subtotal.toFixed(2)}</span>
                </div>
                <div class="price-row">
                    <span>TAX:</span>
                    <span>£${pricing.tax.toFixed(2)}</span>
                </div>
                <div class="price-row total-row">
                    <span>Total:</span>
                    <span>£${pricing.total.toFixed(2)}</span>
                </div>
                <div class="info-row" style="margin-top: 15px;">
                    <span class="info-label">Payment Method:</span>
                    <span class="info-value">${pricing.paymentMethod}</span>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="thank-you">
            <h3 style="margin: 0 0 10px 0;">Thank you for your order!</h3>
            <p style="margin: 0;">We appreciate your business and hope you're satisfied with your completed order.</p>
        </div>

        <div class="footer">
            <p>Receipt generated on ${new Date().toLocaleString()}</p>
            <p>ExtruDough | Custom 3D Manufacturing</p>
            <p>If you have any questions about this order, please contact us with order reference: ${order.code}</p>
        </div>
    </div>
</body>
</html>`;
}

// Send receipt to customer via email
async function sendReceiptToCustomer(order, customerEmail, priceInfo = null) {
    try {
        if (!process.env.SMTP_USER) {
            throw new Error('Email configuration missing');
        }

        const receiptHTML = generateOrderReceipt(order, customerEmail, priceInfo);
        
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: customerEmail,
            subject: `Order Receipt - ${order.code} | Order Complete`,
            html: receiptHTML,
            attachments: [{
                filename: `receipt-${order.code}.html`,
                content: receiptHTML,
                contentType: 'text/html'
            }]
        };

        await emailTransporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending receipt to customer:', error);
        return false;
    }
}

// Check for orders that need attention (overdue, long-pending)
async function checkOrdersNeedingAttention(guild) {
    const overdueOrders = getOverdueOrders();
    const longPendingOrders = Array.from(orderQueue.values()).filter(order => {
        const daysSinceCreated = (Date.now() - order.createdAt) / (1000 * 60 * 60 * 24);
        return daysSinceCreated > 7 && order.status === 'pending';
    });
    
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return;
    
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;
    
    if (overdueOrders.length > 0 || longPendingOrders.length > 0) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Orders Needing Attention')
            .setColor(0xffa500)
            .setTimestamp();
        
        if (overdueOrders.length > 0) {
            const overdueList = overdueOrders.map(order => 
                `${order.code} - <@${order.customerId}> (Due: ${orderDueDates.get(order.code)})`
            ).join('\n');
            embed.addFields({ name: `🚨 Overdue Orders (${overdueOrders.length})`, value: overdueList });
        }
        
        if (longPendingOrders.length > 0) {
            const pendingList = longPendingOrders.map(order => {
                const daysAgo = Math.floor((Date.now() - order.createdAt) / (1000 * 60 * 60 * 24));
                return `${order.code} - <@${order.customerId}> (${daysAgo} days old)`;
            }).join('\n');
            embed.addFields({ name: `⏳ Long Pending Orders (${longPendingOrders.length})`, value: pendingList });
        }
        
        await logChannel.send({ embeds: [embed] });
    }
}

// Set up periodic checks for orders needing attention
setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
        await checkOrdersNeedingAttention(guild);
    }
}, 24 * 60 * 60 * 1000); // Check once per day

// Interaction handler
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
    }
});

// Handle select menu interactions
async function handleSelectMenu(interaction) {
    const { customId, values } = interaction;
    
    if (customId === 'priority_select' || customId === 'status_select') {
        const messageId = interaction.message.id;
        let pending = pendingOrders.get(messageId) || {};
        
        if (customId === 'priority_select') {
            pending.priority = values[0];
        } else if (customId === 'status_select') {
            pending.status = values[0];
        }

        pendingOrders.set(messageId, pending);

        // Check if both priority and status are selected
        if (pending.priority && pending.status) {
            // Create the order
            await createOrderFromSelections(interaction, pending);
            pendingOrders.delete(messageId);
        } else {
            // Update the embed to show what's selected
            const embed = new EmbedBuilder()
                .setTitle('🛠️ Creating Order - Select Options')
                .setColor(0x0099ff)
                .addFields(
                    { name: 'Description', value: pending.description || 'Not set' },
                    { name: 'Customer', value: pending.customer ? `<@${pending.customer}>` : 'Not set' },
                    { name: 'Priority', value: pending.priority ? `${getPriorityEmoji(pending.priority)} ${PRIORITIES[pending.priority].name}` : '❓ Please select', inline: true },
                    { name: 'Status', value: pending.status ? `${getStatusEmoji(pending.status)} ${getStatusName(pending.status)}` : '❓ Please select', inline: true }
                )
                .setFooter({ text: 'Please complete all selections to create the order' });

            await interaction.update({ embeds: [embed] });
        }
    } else if (customId === 'update_status_select') {
        // Handle status update
        const orderCode = interaction.message.embeds[0].fields.find(f => f.name === 'Order Code').value;
        const newStatus = values[0];
        
        await updateOrderStatus(interaction, orderCode, newStatus);
    }
}

// Create order from dropdown selections
async function createOrderFromSelections(interaction, pendingData) {
    try {
        const order = {
            code: generateOrderCode(),
            description: pendingData.description,
            customerId: pendingData.customer,
            customerTag: pendingData.customerTag,
            priority: pendingData.priority,
            status: pendingData.status,
            createdAt: Date.now(),
            createdBy: interaction.user.id,
            channelId: interaction.channel.id,
            lastUpdated: Date.now(),
            attachment: pendingData.attachment || null
        };

        orderQueue.set(order.code, order);
        orderStatistics.totalCreated++;
        
        // Save data after creating order
        saveOrderData();

        const embed = new EmbedBuilder()
            .setTitle('📋 Order Created Successfully!')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Order Code', value: order.code.toString(), inline: true },
                { name: 'Customer', value: `<@${order.customerId}>`, inline: true },
                { name: 'Queue Position', value: getOrderPosition(order.code).toString(), inline: true },
                { name: 'Priority', value: `${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name}`, inline: true },
                { name: 'Status', value: `${getStatusEmoji(order.status)} ${getStatusName(order.status)}`, inline: true },
                { name: 'Created by', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Thread Link', value: `[Go to Ticket](${getThreadLink(order.channelId, interaction.guild.id)})`, inline: false },
                { name: 'Description', value: order.description.substring(0, 1024) }
            )
            .setTimestamp();

        if (order.attachment) {
            embed.addFields({ name: 'Attachment', value: `[${order.attachment.name}](${order.attachment.url})` });
            if (order.attachment.contentType && order.attachment.contentType.startsWith('image/')) {
                embed.setThumbnail(order.attachment.url);
            }
        }

        await interaction.update({ embeds: [embed], components: [] });
        
        // Send confirmation message to the thread
        try {
            await interaction.channel.send(`📋 This ticket has been converted to **Order ${order.code}** and added to the queue at position **${getOrderPosition(order.code)}**.`);
        } catch (error) {
            console.error('Error sending confirmation to thread:', error);
        }
        
        await logOrderAction(interaction.guild, 'Created', order, interaction.user);
        
        // Save data after order creation
        saveOrderData();
    } catch (error) {
        console.error('Error creating order from selections:', error);
        await interaction.update({ 
            content: '❌ There was an error creating the order. Please try again.', 
            embeds: [], 
            components: [] 
        });
    }
}

// Update order status
async function updateOrderStatus(interaction, orderCode, newStatus) {
    try {
        const order = orderQueue.get(orderCode);
        if (!order) {
            return interaction.update({ 
                content: `❌ Order ${orderCode} not found in the queue.`,
                embeds: [],
                components: []
            });
        }

        const oldStatus = order.status;
        order.status = newStatus;
        order.lastUpdated = Date.now();

        const embed = new EmbedBuilder()
            .setTitle('🔄 Order Status Updated')
            .setColor(0x0099ff)
            .addFields(
                { name: 'Order Code', value: orderCode.toString(), inline: true },
                { name: 'Customer', value: `<@${order.customerId}>`, inline: true },
                { name: 'Updated by', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Previous Status', value: `${getStatusEmoji(oldStatus)} ${getStatusName(oldStatus)}`, inline: true },
                { name: 'New Status', value: `${getStatusEmoji(newStatus)} ${getStatusName(newStatus)}`, inline: true },
                { name: 'Priority', value: `${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name}`, inline: true },
                { name: 'Thread Link', value: `[Go to Ticket](${getThreadLink(order.channelId, interaction.guild.id)})`, inline: false },
                { name: 'Description', value: order.description.substring(0, 1024) }
            )
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });
        
        // Notify customer of status change
        try {
            const customer = await client.users.fetch(order.customerId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('📊 Order Status Update')
                .setColor(0x0099ff)
                .addFields(
                    { name: 'Order Code', value: orderCode.toString() },
                    { name: 'New Status', value: `${getStatusEmoji(newStatus)} ${getStatusName(newStatus)}` },
                    { name: 'Description', value: order.description.substring(0, 1024) }
                )
                .setTimestamp();
            
            await customer.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log('Could not DM customer about status update:', error);
        }

        await logOrderAction(interaction.guild, 'Status Updated', order, interaction.user);
        
        // Save data after status update
        saveOrderData();
    } catch (error) {
        console.error('Error updating order status:', error);
        await interaction.update({ 
            content: '❌ There was an error updating the order status. Please try again.',
            embeds: [],
            components: []
        });
    }
}

// Handle slash commands
async function handleSlashCommand(interaction) {
    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'createorder':
                // Check if user has permission to create orders
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to create orders.', 
                        ephemeral: true 
                    });
                }

                const description = interaction.options.getString('description');
                const customer = interaction.options.getUser('customer') || interaction.user;
                const attachment = interaction.options.getAttachment('attachment');

                // Create initial embed and dropdowns
                const embed = new EmbedBuilder()
                    .setTitle('🛠️ Creating Order - Select Options')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: 'Description', value: description },
                        { name: 'Customer', value: `<@${customer.id}>` },
                        { name: 'Priority', value: '❓ Please select from dropdown below', inline: true },
                        { name: 'Status', value: '❓ Please select from dropdown below', inline: true }
                    )
                    .setFooter({ text: 'Use the dropdown menus below to complete the order creation' });

                if (attachment) {
                    embed.addFields({ name: 'Attachment', value: `[${attachment.name}](${attachment.url})` });
                    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                        embed.setImage(attachment.url);
                    }
                }

                const components = createOrderCreationModal();
                
                const response = await interaction.reply({ 
                    embeds: [embed], 
                    components: components,
                    fetchReply: true
                });
                
                // Store pending order data
                pendingOrders.set(response.id, {
                    description: description,
                    customer: customer.id,
                    customerTag: customer.tag,
                    attachment: attachment ? {
                        name: attachment.name,
                        url: attachment.url,
                        contentType: attachment.contentType
                    } : null
                });
                
                break;

            case 'findorder':
                const findOrderCode = interaction.options.getString('order_code').toUpperCase();
                const orderToFind = orderQueue.get(findOrderCode);

                if (!orderToFind) {
                    // Check if it's in history
                    const completedOrderToFind = orderHistory.get(findOrderCode);
                    if (completedOrderToFind) {
                        const threadLink = getThreadLink(completedOrderToFind.channelId, interaction.guild.id);
                        const findCompletedEmbed = new EmbedBuilder()
                            .setTitle('🔍 Order Found (Completed)')
                            .setColor(0x00ff00)
                            .addFields(
                                { name: 'Order Code', value: findOrderCode, inline: true },
                                { name: 'Customer', value: `<@${completedOrderToFind.customerId}>`, inline: true },
                                { name: 'Status', value: `${getStatusEmoji('completed')} ${getStatusName('completed')}`, inline: true },
                                { name: 'Ticket Thread', value: `[Click here to go to ticket](${threadLink})`, inline: false },
                                { name: 'Description', value: completedOrderToFind.description.substring(0, 1024) }
                            )
                            .setTimestamp();

                        if (completedOrderToFind.attachment) {
                            findCompletedEmbed.addFields({ name: 'Attachment', value: `[${completedOrderToFind.attachment.name}](${completedOrderToFind.attachment.url})` });
                            if (completedOrderToFind.attachment.contentType && completedOrderToFind.attachment.contentType.startsWith('image/')) {
                                findCompletedEmbed.setThumbnail(completedOrderToFind.attachment.url);
                            }
                        }

                        return interaction.reply({ embeds: [findCompletedEmbed], ephemeral: true });
                    }

                    return interaction.reply({ 
                        content: `❌ Order ${findOrderCode} not found.`, 
                        ephemeral: true 
                    });
                }

                const threadLink = getThreadLink(orderToFind.channelId, interaction.guild.id);
                const findEmbed = new EmbedBuilder()
                    .setTitle('🔍 Order Found')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: 'Order Code', value: findOrderCode, inline: true },
                        { name: 'Customer', value: `<@${orderToFind.customerId}>`, inline: true },
                        { name: 'Position', value: getOrderPosition(findOrderCode).toString(), inline: true },
                        { name: 'Status', value: `${getStatusEmoji(orderToFind.status)} ${getStatusName(orderToFind.status)}`, inline: true },
                        { name: 'Priority', value: `${getPriorityEmoji(orderToFind.priority)} ${PRIORITIES[orderToFind.priority].name}`, inline: true },
                        { name: 'Created', value: `<t:${Math.floor(orderToFind.createdAt / 1000)}:R>`, inline: true },
                        { name: 'Ticket Thread', value: `[Click here to go to ticket](${threadLink})`, inline: false },
                        { name: 'Description', value: orderToFind.description.substring(0, 1024) }
                    )
                    .setTimestamp();

                if (orderToFind.attachment) {
                    findEmbed.addFields({ name: 'Attachment', value: `[${orderToFind.attachment.name}](${orderToFind.attachment.url})` });
                    if (orderToFind.attachment.contentType && orderToFind.attachment.contentType.startsWith('image/')) {
                        findEmbed.setThumbnail(orderToFind.attachment.url);
                    }
                }

                await interaction.reply({ embeds: [findEmbed], ephemeral: true });
                break;

            case 'updatestatus':
                // Check if user has permission to update orders
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to update order status.', 
                        ephemeral: true 
                    });
                }

                const updateOrderCode = interaction.options.getString('order_code').toUpperCase();
                const orderToUpdate = orderQueue.get(updateOrderCode);

                if (!orderToUpdate) {
                    return interaction.reply({ 
                        content: `❌ Order ${updateOrderCode} not found in the queue.`, 
                        ephemeral: true 
                    });
                }

                const statusSelect = new StringSelectMenuBuilder()
                    .setCustomId('update_status_select')
                    .setPlaceholder('Select new status')
                    .addOptions(
                        Object.entries(ORDER_STATUSES).map(([key, status]) => ({
                            label: status.name,
                            description: status.description,
                            value: key,
                            emoji: status.emoji
                        }))
                    );

                const statusRow = new ActionRowBuilder().addComponents(statusSelect);

                const updateEmbed = new EmbedBuilder()
                    .setTitle('🔄 Update Order Status')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: 'Order Code', value: updateOrderCode, inline: true },
                        { name: 'Customer', value: `<@${orderToUpdate.customerId}>`, inline: true },
                        { name: 'Current Status', value: `${getStatusEmoji(orderToUpdate.status)} ${getStatusName(orderToUpdate.status)}`, inline: true },
                        { name: 'Thread Link', value: `[Go to Ticket](${getThreadLink(orderToUpdate.channelId, interaction.guild.id)})`, inline: false },
                        { name: 'Description', value: orderToUpdate.description.substring(0, 1024) }
                    )
                    .setFooter({ text: 'Select the new status from the dropdown below' });

                await interaction.reply({ embeds: [updateEmbed], components: [statusRow] });
                break;

            case 'queue':
                const orders = Array.from(orderQueue.values());
                
                if (orders.length === 0) {
                    return interaction.reply('📭 The order queue is currently empty.');
                }

                const sortedOrders = sortOrdersByPriority(orders);
                const queueEmbed = new EmbedBuilder()
                    .setTitle('📋 Current Order Queue')
                    .setColor(0x0099ff)
                    .setDescription(`Total orders: ${orders.length}`)
                    .setTimestamp();

                const orderList = sortedOrders.slice(0, 10).map((order, index) => {
                    const position = index + 1;
                    const timeAgo = Math.floor((Date.now() - order.createdAt) / (1000 * 60 * 60 * 24));
                    return `**${position}.** ${getPriorityEmoji(order.priority)} Order ${order.code} - <@${order.customerId}>\n` +
                           `└ ${getStatusEmoji(order.status)} ${getStatusName(order.status)}\n` +
                           `└ ${order.description.substring(0, 100)}${order.description.length > 100 ? '...' : ''}\n` +
                           `└ Created ${timeAgo > 0 ? `${timeAgo} day(s) ago` : 'today'}`;
                }).join('\n\n');

                queueEmbed.addFields({ name: 'Orders', value: orderList || 'No orders in queue' });

                if (orders.length > 10) {
                    queueEmbed.setFooter({ text: `Showing first 10 of ${orders.length} orders` });
                }

                await interaction.reply({ embeds: [queueEmbed] });
                break;

            case 'complete':
                // Check if user has permission to complete orders
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to complete orders.', 
                        ephemeral: true 
                    });
                }

                const completeOrderCode = interaction.options.getString('order_code');
                const orderToComplete = orderQueue.get(completeOrderCode);

                if (!orderToComplete) {
                    return interaction.reply({ 
                        content: `❌ Order ${completeOrderCode} not found in the queue.`, 
                        ephemeral: true 
                    });
                }

                // Check if order has unfulfilled dependencies
                if (!canCompleteOrder(completeOrderCode)) {
                    const dependencies = orderDependencies.get(completeOrderCode) || [];
                    const uncompletedDeps = dependencies.filter(depCode => {
                        const dep = orderHistory.get(depCode);
                        return !dep || dep.status !== 'completed';
                    });
                    
                    return interaction.reply({ 
                        content: `❌ Order ${completeOrderCode} cannot be completed yet. It depends on: ${uncompletedDeps.join(', ')}`, 
                        ephemeral: true 
                    });
                }

                const completedAt = Date.now();

                // Move to history
                orderHistory.set(completeOrderCode, {
                    ...orderToComplete,
                    status: 'completed',
                    completedAt: completedAt,
                    completedBy: interaction.user.id
                });

                // Update statistics
                updateCompletionStatistics(orderToComplete, completedAt);

                // If order has a token, mark it as used
                if (orderToComplete.tokenCode) {
                    const token = promotionalTokens.get(orderToComplete.tokenCode);
                    if (token && !token.used) {
                        token.used = true;
                        token.usedAt = completedAt;
                        token.usedBy = orderToComplete.customerId;
                        token.usedInOrder = completeOrderCode;
                        
                        console.log(`Marked token ${orderToComplete.tokenCode} as used for order ${completeOrderCode}`);
                    }
                }

                // Remove from queue
                orderQueue.delete(completeOrderCode);

                // Check for dependent orders and update their status if all dependencies are met
                const dependentOrders = getOrderDependents(completeOrderCode);
                for (const depOrderCode of dependentOrders) {
                    const depOrder = orderQueue.get(depOrderCode);
                    if (depOrder && canCompleteOrder(depOrderCode)) {
                        depOrder.status = 'ready';
                        depOrder.lastUpdated = Date.now();
                        
                        // Notify customer that their order is now ready
                        try {
                            const customer = await client.users.fetch(depOrder.customerId);
                            await customer.send(`🎉 Your order ${depOrderCode} is now ready! All dependencies have been completed.`);
                        } catch (error) {
                            console.log(`Could not notify customer about order ${depOrderCode}:`, error);
                        }
                    }
                }

                // Save data after completion
                saveOrderData();

                const completeEmbed = new EmbedBuilder()
                    .setTitle('✅ Order Completed')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'Order Code', value: completeOrderCode, inline: true },
                        { name: 'Customer', value: `<@${orderToComplete.customerId}>`, inline: true },
                        { name: 'Completed by', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Final Status', value: `${getStatusEmoji('completed')} ${getStatusName('completed')}`, inline: true },
                        { name: 'Priority', value: `${getPriorityEmoji(orderToComplete.priority)} ${PRIORITIES[orderToComplete.priority].name}`, inline: true },
                        { name: 'Description', value: orderToComplete.description.substring(0, 1024) }
                    );

                // Add token information if a token was used
                if (orderToComplete.tokenCode) {
                    completeEmbed.addFields({ 
                        name: '🎫 Promotional Token', 
                        value: `Token \`${orderToComplete.tokenCode}\` marked as used`, 
                        inline: true 
                    });
                }

                completeEmbed.setTimestamp();

                await interaction.reply({ embeds: [completeEmbed] });
                await logOrderAction(interaction.guild, 'Completed', orderToComplete, interaction.user);

                // Notify customer
                try {
                    const customer = await client.users.fetch(orderToComplete.customerId);
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('🎉 Your Order is Complete!')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: 'Order Code', value: completeOrderCode },
                            { name: 'Description', value: orderToComplete.description.substring(0, 1024) },
                            { name: 'Ticket Thread', value: `[Click here to go to ticket](${getThreadLink(orderToComplete.channelId, interaction.guild.id)})` },
                            { name: 'What\'s Next?', value: '• A staff member may send you a receipt via email and Discord DM\n• You can leave a review using `/review ' + completeOrderCode + '`\n• Check your email for any additional documentation' }
                        )
                        .setFooter({ text: 'Thank you for choosing our services!' })
                        .setTimestamp();
                    
                    await customer.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log('Could not DM customer about completion:', error);
                }
                break;

            case 'position':
                const positionOrderCode = interaction.options.getString('order_code');
                
                if (positionOrderCode) {
                    const order = orderQueue.get(positionOrderCode);
                    if (!order) {
                        return interaction.reply({ 
                            content: `❌ Order ${positionOrderCode} not found in the queue.`, 
                            ephemeral: true 
                        });
                    }

                    const position = getOrderPosition(positionOrderCode);
                    const positionEmbed = new EmbedBuilder()
                        .setTitle('📍 Order Position')
                        .setColor(0x0099ff)
                        .addFields(
                            { name: 'Order Code', value: positionOrderCode, inline: true },
                            { name: 'Position in Queue', value: position.toString(), inline: true },
                            { name: 'Status', value: `${getStatusEmoji(order.status)} ${getStatusName(order.status)}`, inline: true },
                            { name: 'Priority', value: `${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name}`, inline: true },
                            { name: 'Description', value: order.description.substring(0, 1024) }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [positionEmbed], ephemeral: true });
                } else {
                    // Show all orders for this user
                    const userOrders = Array.from(orderQueue.values()).filter(order => order.customerId === interaction.user.id);
                    
                    if (userOrders.length === 0) {
                        return interaction.reply({ 
                            content: '📭 You don\'t have any orders in the queue.', 
                            ephemeral: true 
                        });
                    }

                    const userOrdersEmbed = new EmbedBuilder()
                        .setTitle('📋 Your Orders')
                        .setColor(0x0099ff)
                        .setTimestamp();

                    const ordersList = userOrders.map(order => {
                        const position = getOrderPosition(order.code);
                        return `**Order ${order.code}** - Position: ${position}\n` +
                               `${getStatusEmoji(order.status)} ${getStatusName(order.status)}\n` +
                               `${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name} Priority\n` +
                               `${order.description.substring(0, 100)}${order.description.length > 100 ? '...' : ''}`;
                    }).join('\n\n');

                    userOrdersEmbed.addFields({ name: 'Your Orders', value: ordersList });
                    await interaction.reply({ embeds: [userOrdersEmbed], ephemeral: true });
                }
                break;

            case 'orderstatus':
                const statusOrderCode = interaction.options.getString('order_code');
                const statusOrder = orderQueue.get(statusOrderCode);

                if (!statusOrder) {
                    // Check if it's in history
                    const completedOrder = orderHistory.get(statusOrderCode);
                    if (completedOrder) {
                        const completedEmbed = new EmbedBuilder()
                            .setTitle('✅ Order Status: Completed')
                            .setColor(0x00ff00)
                            .addFields(
                                { name: 'Order Code', value: statusOrderCode, inline: true },
                                { name: 'Customer', value: `<@${completedOrder.customerId}>`, inline: true },
                                { name: 'Completed', value: `<t:${Math.floor(completedOrder.completedAt / 1000)}:R>`, inline: true },
                                { name: 'Final Status', value: `${getStatusEmoji('completed')} ${getStatusName('completed')}`, inline: true },
                                { name: 'Priority', value: `${getPriorityEmoji(completedOrder.priority)} ${PRIORITIES[completedOrder.priority].name}`, inline: true },
                                { name: 'Description', value: completedOrder.description.substring(0, 1024) }
                            )
                            .setTimestamp();

                        return interaction.reply({ embeds: [completedEmbed], ephemeral: true });
                    }

                    return interaction.reply({ 
                        content: `❌ Order ${statusOrderCode} not found.`, 
                        ephemeral: true 
                    });
                }

                const position = getOrderPosition(statusOrderCode);
                const statusEmbed = new EmbedBuilder()
                    .setTitle('📋 Order Status: In Queue')
                    .setColor(0xffff00)
                    .addFields(
                        { name: 'Order Code', value: statusOrderCode, inline: true },
                        { name: 'Customer', value: `<@${statusOrder.customerId}>`, inline: true },
                        { name: 'Position', value: position.toString(), inline: true },
                        { name: 'Status', value: `${getStatusEmoji(statusOrder.status)} ${getStatusName(statusOrder.status)}`, inline: true },
                        { name: 'Priority', value: `${getPriorityEmoji(statusOrder.priority)} ${PRIORITIES[statusOrder.priority].name}`, inline: true },
                        { name: 'Last Updated', value: `<t:${Math.floor(statusOrder.lastUpdated / 1000)}:R>`, inline: true },
                        { name: 'Created', value: `<t:${Math.floor(statusOrder.createdAt / 1000)}:R>`, inline: true },
                        { name: 'Created by', value: `<@${statusOrder.createdBy}>`, inline: true },
                        { name: 'Description', value: statusOrder.description.substring(0, 1024) },
                        { name: 'Ticket Thread', value: `[Click here to go to ticket](${getThreadLink(statusOrder.channelId, interaction.guild.id)})` }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
                break;

            case 'myorders':
                const myActiveOrders = Array.from(orderQueue.values()).filter(order => order.customerId === interaction.user.id);
                const myCompletedOrders = Array.from(orderHistory.values()).filter(order => order.customerId === interaction.user.id);
                
                if (myActiveOrders.length === 0 && myCompletedOrders.length === 0) {
                    return interaction.reply({ 
                        content: '📭 You don\'t have any orders (current or completed).', 
                        ephemeral: true 
                    });
                }

                const myOrdersEmbed = new EmbedBuilder()
                    .setTitle('📋 Your Orders')
                    .setColor(0x0099ff)
                    .setDescription(`**Active Orders:** ${myActiveOrders.length} | **Completed Orders:** ${myCompletedOrders.length}`)
                    .setTimestamp();

                // Add current orders section
                if (myActiveOrders.length > 0) {
                    const activeOrdersList = myActiveOrders.map(order => {
                        const position = getOrderPosition(order.code);
                        const timeAgo = Math.floor((Date.now() - order.createdAt) / (1000 * 60 * 60 * 24));
                        return `**${order.code}** - Position: ${position}\n` +
                               `${getStatusEmoji(order.status)} ${getStatusName(order.status)} | ${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name}\n` +
                               `Created ${timeAgo > 0 ? `${timeAgo} day(s) ago` : 'today'}\n` +
                               `${order.description.substring(0, 100)}${order.description.length > 100 ? '...' : ''}`;
                    }).join('\n\n');

                    myOrdersEmbed.addFields({ 
                        name: '🔄 Current Orders in Queue', 
                        value: activeOrdersList.substring(0, 1024), 
                        inline: false 
                    });
                }

                // Add completed orders section (limit to most recent 5)
                if (myCompletedOrders.length > 0) {
                    const recentCompletedOrders = myCompletedOrders
                        .sort((a, b) => b.completedAt - a.completedAt)
                        .slice(0, 5);

                    const completedOrdersList = recentCompletedOrders.map(order => {
                        const completedAgo = Math.floor((Date.now() - order.completedAt) / (1000 * 60 * 60 * 24));
                        const hasReview = orderReviews.has(order.code);
                        return `**${order.code}** ${hasReview ? '⭐' : '📝'}\n` +
                               `✅ Completed ${completedAgo > 0 ? `${completedAgo} day(s) ago` : 'today'}\n` +
                               `${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name} Priority\n` +
                               `${order.description.substring(0, 100)}${order.description.length > 100 ? '...' : ''}`;
                    }).join('\n\n');

                    const completedFieldName = myCompletedOrders.length > 5 
                        ? `✅ Recent Completed Orders (${recentCompletedOrders.length} of ${myCompletedOrders.length})`
                        : `✅ Completed Orders (${myCompletedOrders.length})`;

                    myOrdersEmbed.addFields({ 
                        name: completedFieldName, 
                        value: completedOrdersList.substring(0, 1024), 
                        inline: false 
                    });

                    // Add review reminder for orders without reviews
                    const unreviewed = myCompletedOrders.filter(order => !orderReviews.has(order.code));
                    if (unreviewed.length > 0) {
                        myOrdersEmbed.setFooter({ 
                            text: `💡 You have ${unreviewed.length} completed order(s) that can be reviewed! Use /review to leave feedback.` 
                        });
                    }
                }

                await interaction.reply({ embeds: [myOrdersEmbed], ephemeral: true });
                break;

            case 'removeorder':
                // Check if user has permission to remove orders
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to remove orders.', 
                        ephemeral: true 
                    });
                }

                const removeOrderCode = interaction.options.getString('order_code');
                const orderToRemove = orderQueue.get(removeOrderCode);

                if (!orderToRemove) {
                    return interaction.reply({ 
                        content: `❌ Order ${removeOrderCode} not found in the queue.`, 
                        ephemeral: true 
                    });
                }

                orderQueue.delete(removeOrderCode);

                const removeEmbed = new EmbedBuilder()
                    .setTitle('🗑️ Order Removed')
                    .setColor(0xff0000)
                    .addFields(
                        { name: 'Order Code', value: removeOrderCode, inline: true },
                        { name: 'Customer', value: `<@${orderToRemove.customerId}>`, inline: true },
                        { name: 'Removed by', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Status', value: `${getStatusEmoji(orderToRemove.status)} ${getStatusName(orderToRemove.status)}`, inline: true },
                        { name: 'Priority', value: `${getPriorityEmoji(orderToRemove.priority)} ${PRIORITIES[orderToRemove.priority].name}`, inline: true },
                        { name: 'Description', value: orderToRemove.description.substring(0, 1024) }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [removeEmbed] });
                await logOrderAction(interaction.guild, 'Removed', orderToRemove, interaction.user);
                
                // Save data after removal
                saveOrderData();
                break;

            case 'moveorder':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to move orders.', 
                        ephemeral: true 
                    });
                }

                const moveOrderCode = interaction.options.getString('order_code').toUpperCase();
                const newPosition = interaction.options.getInteger('position');
                
                if (!orderQueue.has(moveOrderCode)) {
                    return interaction.reply({ 
                        content: `❌ Order ${moveOrderCode} not found in the queue.`, 
                        ephemeral: true 
                    });
                }

                const totalOrdersInQueue = orderQueue.size;
                if (newPosition > totalOrdersInQueue) {
                    return interaction.reply({ 
                        content: `❌ Position ${newPosition} is invalid. Queue has ${totalOrdersInQueue} orders.`, 
                        ephemeral: true 
                    });
                }

                if (moveOrderToPosition(moveOrderCode, newPosition)) {
                    const moveEmbed = new EmbedBuilder()
                        .setTitle('🔄 Order Moved')
                        .setColor(0x0099ff)
                        .addFields(
                            { name: 'Order Code', value: moveOrderCode, inline: true },
                            { name: 'New Position', value: newPosition.toString(), inline: true },
                            { name: 'Moved by', value: `<@${interaction.user.id}>`, inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [moveEmbed] });
                    await logOrderAction(interaction.guild, 'Moved', orderQueue.get(moveOrderCode), interaction.user);
                } else {
                    await interaction.reply({ 
                        content: '❌ Failed to move order. Please try again.', 
                        ephemeral: true 
                    });
                }
                break;

            case 'rush':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to rush orders.', 
                        ephemeral: true 
                    });
                }

                const rushOrderCode = interaction.options.getString('order_code').toUpperCase();
                const rushOrder = orderQueue.get(rushOrderCode);
                
                if (!rushOrder) {
                    return interaction.reply({ 
                        content: `❌ Order ${rushOrderCode} not found in the queue.`, 
                        ephemeral: true 
                    });
                }

                // Set priority to urgent and move to front
                rushOrder.priority = 'urgent';
                rushOrder.lastUpdated = Date.now();
                moveOrderToPosition(rushOrderCode, 1);

                const rushEmbed = new EmbedBuilder()
                    .setTitle('🚨 Order Rushed')
                    .setColor(0xff0000)
                    .addFields(
                        { name: 'Order Code', value: rushOrderCode, inline: true },
                        { name: 'Customer', value: `<@${rushOrder.customerId}>`, inline: true },
                        { name: 'New Priority', value: `${getPriorityEmoji('urgent')} Urgent`, inline: true },
                        { name: 'New Position', value: '1', inline: true },
                        { name: 'Rushed by', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [rushEmbed] });
                await logOrderAction(interaction.guild, 'Rushed', rushOrder, interaction.user);

                // Notify customer
                try {
                    const customer = await client.users.fetch(rushOrder.customerId);
                    await customer.send(`🚨 Your order ${rushOrderCode} has been marked as urgent and moved to the front of the queue!`);
                } catch (error) {
                    console.log('Could not DM customer about rush:', error);
                }
                break;

            case 'stats':
                const currentQueueSize = orderQueue.size;
                const totalCompleted = orderStatistics.totalCompleted;
                const avgCompletionTime = formatDuration(orderStatistics.averageCompletionTime);

                const statusCounts = {};
                const priorityCounts = {};
                
                for (const order of orderQueue.values()) {
                    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
                    priorityCounts[order.priority] = (priorityCounts[order.priority] || 0) + 1;
                }

                const overdueCount = getOverdueOrders().length;
                
                const statsEmbed = new EmbedBuilder()
                    .setTitle('📊 Order Queue Statistics')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: '📋 Queue Overview', value: 
                            `**Current Orders:** ${currentQueueSize}\n` +
                            `**Total Completed:** ${totalCompleted}\n` +
                            `**Average Completion Time:** ${avgCompletionTime || 'N/A'}\n` +
                            `**Overdue Orders:** ${overdueCount}`, inline: true },
                        
                        { name: '📈 By Status', value: 
                            Object.entries(statusCounts).map(([status, count]) => 
                                `${getStatusEmoji(status)} ${getStatusName(status)}: ${count}`
                            ).join('\n') || 'None', inline: true },
                        
                        { name: '⚡ By Priority', value: 
                            Object.entries(priorityCounts).map(([priority, count]) => 
                                `${getPriorityEmoji(priority)} ${PRIORITIES[priority].name}: ${count}`
                            ).join('\n') || 'None', inline: true }
                    )
                    .setTimestamp();

                // Add priority-specific completion times
                const priorityTimes = Object.entries(PRIORITIES).map(([key, priority]) => {
                    const avgTime = calculateAverageCompletionTime(key);
                    return `${priority.emoji} ${priority.name}: ${avgTime > 0 ? formatDuration(avgTime) : 'N/A'}`;
                }).join('\n');

                statsEmbed.addFields({ 
                    name: '⏱️ Avg Completion Time by Priority', 
                    value: priorityTimes, 
                    inline: false 
                });

                await interaction.reply({ embeds: [statsEmbed] });
                break;

            case 'bulkcomplete':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to complete orders.', 
                        ephemeral: true 
                    });
                }

                const orderCodes = interaction.options.getString('order_codes')
                    .split(',')
                    .map(code => code.trim().toUpperCase())
                    .filter(code => code.length > 0);

                if (orderCodes.length === 0) {
                    return interaction.reply({ 
                        content: '❌ No valid order codes provided.', 
                        ephemeral: true 
                    });
                }

                const completedOrders = [];
                const failedOrders = [];

                for (const code of orderCodes) {
                    const order = orderQueue.get(code);
                    if (order) {
                        const completedAt = Date.now();
                        
                        // Move to history
                        orderHistory.set(code, {
                            ...order,
                            status: 'completed',
                            completedAt: completedAt,
                            completedBy: interaction.user.id
                        });

                        // Update statistics
                        updateCompletionStatistics(order, completedAt);

                        // Remove from queue
                        orderQueue.delete(code);
                        completedOrders.push(order);

                        // Notify customer
                        try {
                            const customer = await client.users.fetch(order.customerId);
                            await customer.send(`✅ Your order ${code} has been completed! Thank you for your business!`);
                        } catch (error) {
                            console.log(`Could not DM customer for order ${code}:`, error);
                        }
                    } else {
                        failedOrders.push(code);
                    }
                }

                const bulkEmbed = new EmbedBuilder()
                    .setTitle('✅ Bulk Order Completion')
                    .setColor(completedOrders.length > 0 ? 0x00ff00 : 0xff0000)
                    .addFields(
                        { name: 'Completed Orders', value: 
                            completedOrders.length > 0 
                                ? completedOrders.map(o => `${o.code} - <@${o.customerId}>`).join('\n')
                                : 'None', inline: false }
                    )
                    .setTimestamp();

                if (failedOrders.length > 0) {
                    bulkEmbed.addFields({ 
                        name: 'Failed Orders', 
                        value: failedOrders.join(', '), 
                        inline: false 
                    });
                }

                await interaction.reply({ embeds: [bulkEmbed] });

                // Log each completion
                for (const order of completedOrders) {
                    await logOrderAction(interaction.guild, 'Completed (Bulk)', order, interaction.user);
                }
                break;

            case 'setduedate':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to set due dates.', 
                        ephemeral: true 
                    });
                }

                const dueDateOrderCode = interaction.options.getString('order_code').toUpperCase();
                const dueDateString = interaction.options.getString('due_date');
                
                if (!orderQueue.has(dueDateOrderCode)) {
                    return interaction.reply({ 
                        content: `❌ Order ${dueDateOrderCode} not found in the queue.`, 
                        ephemeral: true 
                    });
                }

                // Validate date format (YYYY-MM-DD)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(dueDateString)) {
                    return interaction.reply({ 
                        content: '❌ Invalid date format. Please use YYYY-MM-DD format.', 
                        ephemeral: true 
                    });
                }

                const dueDate = new Date(dueDateString);
                if (isNaN(dueDate.getTime())) {
                    return interaction.reply({ 
                        content: '❌ Invalid date. Please check your date format.', 
                        ephemeral: true 
                    });
                }

                orderDueDates.set(dueDateOrderCode, dueDateString);
                const dueDateOrder = orderQueue.get(dueDateOrderCode);

                const dueDateEmbed = new EmbedBuilder()
                    .setTitle('📅 Due Date Set')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: 'Order Code', value: dueDateOrderCode, inline: true },
                        { name: 'Customer', value: `<@${dueDateOrder.customerId}>`, inline: true },
                        { name: 'Due Date', value: dueDateString, inline: true },
                        { name: 'Set by', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [dueDateEmbed] });
                await logOrderAction(interaction.guild, 'Due Date Set', dueDateOrder, interaction.user);
                
                // Save data after setting due date
                saveOrderData();
                break;

            case 'adddependency':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to add dependencies.', 
                        ephemeral: true 
                    });
                }

                const dependentOrderCode = interaction.options.getString('order_code').toUpperCase();
                const dependsOnCode = interaction.options.getString('depends_on').toUpperCase();
                
                if (!orderQueue.has(dependentOrderCode)) {
                    return interaction.reply({ 
                        content: `❌ Order ${dependentOrderCode} not found in the queue.`, 
                        ephemeral: true 
                    });
                }

                if (!orderQueue.has(dependsOnCode) && !orderHistory.has(dependsOnCode)) {
                    return interaction.reply({ 
                        content: `❌ Order ${dependsOnCode} not found.`, 
                        ephemeral: true 
                    });
                }

                if (dependentOrderCode === dependsOnCode) {
                    return interaction.reply({ 
                        content: '❌ An order cannot depend on itself.', 
                        ephemeral: true 
                    });
                }

                // Add dependency
                const currentDeps = orderDependencies.get(dependentOrderCode) || [];
                if (!currentDeps.includes(dependsOnCode)) {
                    currentDeps.push(dependsOnCode);
                    orderDependencies.set(dependentOrderCode, currentDeps);
                }

                const depEmbed = new EmbedBuilder()
                    .setTitle('🔗 Dependency Added')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: 'Dependent Order', value: dependentOrderCode, inline: true },
                        { name: 'Depends On', value: dependsOnCode, inline: true },
                        { name: 'Added by', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [depEmbed] });
                
                // Save data after adding dependency
                saveOrderData();
                break;

            case 'overdue':
                const overdueOrders = getOverdueOrders();
                
                if (overdueOrders.length === 0) {
                    return interaction.reply({ 
                        content: '✅ No orders are currently overdue!', 
                        ephemeral: true 
                    });
                }

                const overdueEmbed = new EmbedBuilder()
                    .setTitle('🚨 Overdue Orders')
                    .setColor(0xff0000)
                    .setDescription(`Found ${overdueOrders.length} overdue order(s)`)
                    .setTimestamp();

                const overdueList = overdueOrders.map(order => {
                    const dueDate = orderDueDates.get(order.code);
                    const daysOverdue = Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
                    return `**${order.code}** - <@${order.customerId}>\n` +
                           `└ Due: ${dueDate} (${daysOverdue} days overdue)\n` +
                           `└ ${getStatusEmoji(order.status)} ${getStatusName(order.status)}\n` +
                           `└ ${order.description.substring(0, 100)}${order.description.length > 100 ? '...' : ''}`;
                }).join('\n\n');

                overdueEmbed.addFields({ name: 'Overdue Orders', value: overdueList });
                await interaction.reply({ embeds: [overdueEmbed] });
                break;

            case 'savedata':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to save data.', 
                        ephemeral: true 
                    });
                }

                try {
                    saveOrderData();
                    const saveEmbed = new EmbedBuilder()
                        .setTitle('💾 Data Saved Successfully')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: 'Orders', value: orderQueue.size.toString(), inline: true },
                            { name: 'History', value: orderHistory.size.toString(), inline: true },
                            { name: 'Dependencies', value: orderDependencies.size.toString(), inline: true },
                            { name: 'Due Dates', value: orderDueDates.size.toString(), inline: true },
                            { name: 'Saved At', value: new Date().toLocaleString(), inline: false }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [saveEmbed], ephemeral: true });
                } catch (error) {
                    await interaction.reply({ 
                        content: '❌ Error saving data. Check console for details.', 
                        ephemeral: true 
                    });
                }
                break;

            case 'roleinfo':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to view role information.', 
                        ephemeral: true 
                    });
                }

                try {
                    const guild = interaction.guild;
                    const roles = guild.roles.cache
                        .filter(role => role.name !== '@everyone')
                        .sort((a, b) => b.position - a.position)
                        .first(20); // Show first 20 roles

                    const roleInfo = roles.map(role => 
                        `**${role.name}** - ID: \`${role.id}\``
                    ).join('\n');

                    const roleEmbed = new EmbedBuilder()
                        .setTitle('🔧 Server Roles Information')
                        .setDescription('Use these role IDs in your .env file for ADMIN_ROLE_ID or STAFF_ROLE_ID')
                        .setColor(0x0099ff)
                        .addFields(
                            { name: 'Current Admin Role', value: process.env.ADMIN_ROLE_ID || 'Not set', inline: true },
                            { name: 'Current Staff Role', value: process.env.STAFF_ROLE_ID || 'Not set', inline: true },
                            { name: 'Available Roles', value: roleInfo || 'No roles found', inline: false }
                        )
                        .setFooter({ text: 'Copy the role ID and add it to your .env file, then restart the bot' })
                        .setTimestamp();

                    await interaction.reply({ embeds: [roleEmbed], ephemeral: true });
                } catch (error) {
                    await interaction.reply({ 
                        content: '❌ Error getting role information. Check console for details.', 
                        ephemeral: true 
                    });
                }
                break;

            case 'review':
                const reviewOrderCode = interaction.options.getString('order_code').toUpperCase();
                const rating = interaction.options.getInteger('rating');
                const comment = interaction.options.getString('comment');
                const reviewImage = interaction.options.getAttachment('image');

                // Check if order exists in history (completed orders only)
                const completedOrder = orderHistory.get(reviewOrderCode);
                if (!completedOrder) {
                    return interaction.reply({ 
                        content: `❌ Order ${reviewOrderCode} not found in completed orders. You can only review completed orders.`, 
                        ephemeral: true 
                    });
                }

                // Check if the user was the customer for this order
                if (completedOrder.customerId !== interaction.user.id) {
                    return interaction.reply({ 
                        content: `❌ You can only review orders that you placed. Order ${reviewOrderCode} belongs to someone else.`, 
                        ephemeral: true 
                    });
                }

                // Check if order already has a review
                if (orderReviews.has(reviewOrderCode)) {
                    return interaction.reply({ 
                        content: `❌ Order ${reviewOrderCode} has already been reviewed. You can only review each order once.`, 
                        ephemeral: true 
                    });
                }

                // Create the review
                const review = {
                    orderCode: reviewOrderCode,
                    customerId: interaction.user.id,
                    customerTag: interaction.user.tag,
                    rating: rating,
                    comment: comment,
                    createdAt: Date.now(),
                    image: reviewImage ? {
                        name: reviewImage.name,
                        url: reviewImage.url,
                        contentType: reviewImage.contentType
                    } : null
                };

                // Save the review
                orderReviews.set(reviewOrderCode, review);

                // Create star rating display
                const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

                // Create review embed for user confirmation
                const reviewEmbed = new EmbedBuilder()
                    .setTitle('⭐ Review Submitted Successfully')
                    .setColor(0xffd700)
                    .addFields(
                        { name: 'Order Code', value: reviewOrderCode, inline: true },
                        { name: 'Rating', value: `${stars} (${rating}/5)`, inline: true },
                        { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: 'Your Review', value: comment.substring(0, 1024) }
                    )
                    .setTimestamp();

                if (reviewImage) {
                    reviewEmbed.addFields({ name: 'Attached Image', value: `[${reviewImage.name}](${reviewImage.url})` });
                    if (reviewImage.contentType && reviewImage.contentType.startsWith('image/')) {
                        reviewEmbed.setThumbnail(reviewImage.url);
                    }
                }

                await interaction.reply({ embeds: [reviewEmbed], ephemeral: true });

                // Post review to reviews channel
                const reviewsChannelId = process.env.REVIEWS_CHANNEL_ID;
                if (reviewsChannelId) {
                    try {
                        const reviewsChannel = interaction.guild.channels.cache.get(reviewsChannelId);
                        if (reviewsChannel) {
                            const publicReviewEmbed = new EmbedBuilder()
                                .setTitle('🌟 New Customer Review')
                                .setColor(0xffd700)
                                .addFields(
                                    { name: 'Order', value: reviewOrderCode, inline: true },
                                    { name: 'Rating', value: `${stars} (${rating}/5)`, inline: true },
                                    { name: 'Customer', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: 'Order Description', value: completedOrder.description.substring(0, 200) + (completedOrder.description.length > 200 ? '...' : ''), inline: false },
                                    { name: 'Review', value: comment.substring(0, 1024) }
                                )
                                .setTimestamp()
                                .setFooter({ text: `Review #${orderReviews.size}` });

                            if (reviewImage && reviewImage.contentType && reviewImage.contentType.startsWith('image/')) {
                                publicReviewEmbed.setImage(reviewImage.url);
                            }

                            await reviewsChannel.send({ embeds: [publicReviewEmbed] });
                        }
                    } catch (error) {
                        console.log('Could not post review to reviews channel:', error);
                    }
                }

                // Save data after review
                saveOrderData();
                break;

            case 'printlabel':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to print labels.', 
                        ephemeral: true 
                    });
                }

                const printOrderCode = interaction.options.getString('order_code').toUpperCase();
                
                // Check if order exists in queue or history
                let orderToPrint = orderQueue.get(printOrderCode);
                let isCompleted = false;
                
                if (!orderToPrint) {
                    orderToPrint = orderHistory.get(printOrderCode);
                    isCompleted = true;
                }

                if (!orderToPrint) {
                    return interaction.reply({ 
                        content: `❌ Order ${printOrderCode} not found.`, 
                        ephemeral: true 
                    });
                }

                // Check if email is configured
                if (!process.env.PRINTER_EMAIL || !process.env.SMTP_USER) {
                    return interaction.reply({ 
                        content: '❌ Printer email not configured. Please set PRINTER_EMAIL and SMTP settings in .env file.', 
                        ephemeral: true 
                    });
                }

                // Send initial response
                await interaction.reply({ 
                    content: `🖨️ Generating label for order ${printOrderCode}...`, 
                    ephemeral: true 
                });

                // Send label to printer
                const success = await sendLabelToPrinter(orderToPrint, interaction);

                if (success) {
                    const printEmbed = new EmbedBuilder()
                        .setTitle('🖨️ Label Sent to Printer')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: 'Order Code', value: printOrderCode, inline: true },
                            { name: 'Customer', value: `<@${orderToPrint.customerId}>`, inline: true },
                            { name: 'Status', value: isCompleted ? '✅ Completed' : `${getStatusEmoji(orderToPrint.status)} ${getStatusName(orderToPrint.status)}`, inline: true },
                            { name: 'Priority', value: `${getPriorityEmoji(orderToPrint.priority)} ${PRIORITIES[orderToPrint.priority].name}`, inline: true },
                            { name: 'Printer Email', value: process.env.PRINTER_EMAIL, inline: true },
                            { name: 'Label Type', value: 'Standard Order Label (4" x 6")', inline: true }
                        )
                        .setFooter({ text: 'Label should print within a few minutes' })
                        .setTimestamp();

                    await interaction.editReply({ content: '', embeds: [printEmbed] });
                    
                    // Log the print action
                    await logOrderAction(interaction.guild, 'Label Printed', orderToPrint, interaction.user);
                } else {
                    await interaction.editReply({ 
                        content: '❌ Failed to send label to printer. Check console for details and verify email configuration.', 
                    });
                }
                break;

            case 'sendreceipt':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to send receipts.', 
                        ephemeral: true 
                    });
                }

                const receiptOrderCode = interaction.options.getString('order_code').toUpperCase();
                const customerEmail = interaction.options.getString('customer_email');
                const subtotal = interaction.options.getNumber('subtotal') || 0;
                const tax = interaction.options.getNumber('tax') || 0;
                const paymentMethod = interaction.options.getString('payment_method') || 'Paid in advance';
                
                // Check if order exists (must be completed to send receipt)
                const completedOrderForReceipt = orderHistory.get(receiptOrderCode);

                if (!completedOrderForReceipt) {
                    return interaction.reply({ 
                        content: `❌ Order ${receiptOrderCode} not found in completed orders. Only completed orders can have receipts sent.`, 
                        ephemeral: true 
                    });
                }

                // Check if email is configured
                if (!process.env.SMTP_USER) {
                    return interaction.reply({ 
                        content: '❌ Email not configured. Please set SMTP settings in .env file.', 
                        ephemeral: true 
                    });
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(customerEmail)) {
                    return interaction.reply({ 
                        content: '❌ Invalid email address format.', 
                        ephemeral: true 
                    });
                }

                // Create pricing info
                const total = subtotal + tax;
                const priceInfo = {
                    subtotal: subtotal,
                    tax: tax,
                    total: total,
                    currency: 'GBP',
                    paymentMethod: paymentMethod
                };

                // Send initial response
                await interaction.reply({ 
                    content: `📧 Generating and sending receipt for order ${receiptOrderCode} to ${customerEmail} and Discord DM...`, 
                    ephemeral: true 
                });

                // Send receipt to customer via email
                const receiptSuccess = await sendReceiptToCustomer(completedOrderForReceipt, customerEmail, priceInfo);

                // Send receipt to customer via Discord DM
                let dmSuccess = false;
                try {
                    const customer = await client.users.fetch(completedOrderForReceipt.customerId);
                    
                    const dmReceiptEmbed = new EmbedBuilder()
                        .setTitle('🧾 Order Receipt')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: 'Order Code', value: receiptOrderCode, inline: true },
                            { name: 'Status', value: '✅ Completed', inline: true },
                            { name: 'Completed Date', value: `<t:${Math.floor(completedOrderForReceipt.completedAt / 1000)}:D>`, inline: true },
                            { name: 'Priority', value: `${getPriorityEmoji(completedOrderForReceipt.priority)} ${PRIORITIES[completedOrderForReceipt.priority].name}`, inline: true },
                            { name: 'Processing Time', value: formatDuration(completedOrderForReceipt.completedAt - completedOrderForReceipt.createdAt), inline: true },
                            { name: 'Payment Method', value: paymentMethod, inline: true }
                        )
                        .addFields(
                            { name: 'Order Description', value: completedOrderForReceipt.description.substring(0, 1024) }
                        );

                    // Add pricing information if provided
                    if (total > 0) {
                        dmReceiptEmbed.addFields(
                            { name: 'Pricing Details', value: `**Subtotal:** £${subtotal.toFixed(2)}\n**Tax:** £${tax.toFixed(2)}\n**Total:** £${total.toFixed(2)}`, inline: false }
                        );
                    }

                    dmReceiptEmbed.addFields(
                        { name: 'Thank You!', value: 'Thank you for your order! We hope you\'re satisfied with the completed work. A detailed receipt has also been sent to your email address.', inline: false }
                    );

                    if (completedOrderForReceipt.attachment) {
                        dmReceiptEmbed.addFields({ name: 'Original Attachment', value: `[${completedOrderForReceipt.attachment.name}](${completedOrderForReceipt.attachment.url})` });
                        if (completedOrderForReceipt.attachment.contentType && completedOrderForReceipt.attachment.contentType.startsWith('image/')) {
                            dmReceiptEmbed.setThumbnail(completedOrderForReceipt.attachment.url);
                        }
                    }

                    dmReceiptEmbed.setFooter({ text: `ExtruDough | Receipt generated on ${new Date().toLocaleDateString()}` })
                        .setTimestamp();

                    await customer.send({ embeds: [dmReceiptEmbed] });
                    dmSuccess = true;
                } catch (error) {
                    console.log('Could not send DM receipt to customer:', error);
                    dmSuccess = false;
                }

                if (receiptSuccess || dmSuccess) {
                    const deliveryMethods = [];
                    if (receiptSuccess) deliveryMethods.push('📧 Email');
                    if (dmSuccess) deliveryMethods.push('💬 Discord DM');
                    
                    const receiptEmbed = new EmbedBuilder()
                        .setTitle('🧾 Receipt Sent Successfully')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: 'Order Code', value: receiptOrderCode, inline: true },
                            { name: 'Customer', value: `<@${completedOrderForReceipt.customerId}>`, inline: true },
                            { name: 'Email Sent To', value: receiptSuccess ? customerEmail : '❌ Failed', inline: true },
                            { name: 'Discord DM', value: dmSuccess ? '✅ Sent' : '❌ Failed', inline: true },
                            { name: 'Delivery Methods', value: deliveryMethods.join(', '), inline: true },
                            { name: 'Subtotal', value: subtotal > 0 ? `£${subtotal.toFixed(2)}` : 'Not specified', inline: true },
                            { name: 'Tax/VAT', value: tax > 0 ? `£${tax.toFixed(2)}` : 'Not specified', inline: true },
                            { name: 'Total', value: total > 0 ? `£${total.toFixed(2)}` : 'Not specified', inline: true },
                            { name: 'Payment Method', value: paymentMethod, inline: true }
                        )
                        .setFooter({ text: 'Receipt delivered via multiple channels' })
                        .setTimestamp();

                    await interaction.editReply({ content: '', embeds: [receiptEmbed] });
                    
                    // Log the receipt action
                    await logOrderAction(interaction.guild, 'Receipt Sent', completedOrderForReceipt, interaction.user);
                } else {
                    await interaction.editReply({ 
                        content: '❌ Failed to send receipt. Check console for details and verify email configuration.', 
                    });
                }
                break;

            case 'eraseorder':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to erase orders.', 
                        ephemeral: true 
                    });
                }

                const eraseOrderCode = interaction.options.getString('order_code').toUpperCase();
                const eraseReason = interaction.options.getString('reason');
                const confirmErase = interaction.options.getBoolean('confirm');
                
                // Double-check confirmation
                if (!confirmErase) {
                    return interaction.reply({ 
                        content: '❌ Order erase cancelled. You must set "confirm" to true to permanently delete an order.', 
                        ephemeral: true 
                    });
                }

                // Find the order in queue or history
                let orderToErase = orderQueue.get(eraseOrderCode);
                let wasActive = true;
                let orderLocation = 'active queue';
                
                if (!orderToErase) {
                    orderToErase = orderHistory.get(eraseOrderCode);
                    wasActive = false;
                    orderLocation = 'history';
                }

                if (!orderToErase) {
                    return interaction.reply({ 
                        content: `❌ Order ${eraseOrderCode} not found in either active queue or history.`, 
                        ephemeral: true 
                    });
                }

                // Create backup info before deletion
                const backupInfo = {
                    ...orderToErase,
                    erasedAt: Date.now(),
                    erasedBy: interaction.user.id,
                    erasedReason: eraseReason,
                    wasActive: wasActive
                };

                // Remove from all systems
                if (wasActive) {
                    orderQueue.delete(eraseOrderCode);
                } else {
                    orderHistory.delete(eraseOrderCode);
                }

                // Remove from related data structures
                orderReviews.delete(eraseOrderCode);
                orderDependencies.delete(eraseOrderCode);
                orderDueDates.delete(eraseOrderCode);

                // Remove this order from other orders' dependencies
                for (const [code, deps] of orderDependencies.entries()) {
                    const updatedDeps = deps.filter(dep => dep !== eraseOrderCode);
                    if (updatedDeps.length !== deps.length) {
                        orderDependencies.set(code, updatedDeps);
                    }
                }

                // Update statistics if it was a completed order
                if (!wasActive && orderToErase.status === 'completed') {
                    orderStatistics.totalCompleted = Math.max(0, orderStatistics.totalCompleted - 1);
                    
                    // Remove from completion times (simplified - just recalculate)
                    const allTimes = Object.values(orderStatistics.completionTimesByPriority).flat();
                    if (allTimes.length > 0) {
                        orderStatistics.averageCompletionTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
                    } else {
                        orderStatistics.averageCompletionTime = 0;
                    }
                }

                // Save data after erasure
                saveOrderData();

                // Create detailed log embed
                const eraseEmbed = new EmbedBuilder()
                    .setTitle('🗑️ Order Permanently Erased')
                    .setColor(0xff0000)
                    .addFields(
                        { name: 'Order Code', value: eraseOrderCode, inline: true },
                        { name: 'Customer', value: `<@${orderToErase.customerId}>`, inline: true },
                        { name: 'Erased by', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Original Status', value: `${getStatusEmoji(orderToErase.status)} ${getStatusName(orderToErase.status)}`, inline: true },
                        { name: 'Original Priority', value: `${getPriorityEmoji(orderToErase.priority)} ${PRIORITIES[orderToErase.priority].name}`, inline: true },
                        { name: 'Location', value: `${orderLocation}`, inline: true },
                        { name: 'Reason for Erasure', value: eraseReason, inline: false },
                        { name: 'Original Description', value: orderToErase.description.substring(0, 1024), inline: false },
                        { name: '⚠️ WARNING', value: 'This order has been **permanently deleted** from all systems and cannot be recovered.', inline: false }
                    )
                    .setFooter({ text: 'This action cannot be undone' })
                    .setTimestamp();

                await interaction.reply({ embeds: [eraseEmbed] });

                // Log the erasure action with special logging
                try {
                    const logChannelId = process.env.LOG_CHANNEL_ID;
                    if (logChannelId) {
                        const logChannel = interaction.guild.channels.cache.get(logChannelId);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('🚨 CRITICAL: Order Permanently Erased')
                                .setColor(0xff0000)
                                .addFields(
                                    { name: 'Order Code', value: eraseOrderCode, inline: true },
                                    { name: 'Customer', value: `<@${orderToErase.customerId}>`, inline: true },
                                    { name: 'Erased by', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: 'Erasure Reason', value: eraseReason, inline: false },
                                    { name: 'Original Order Info', value: `Status: ${getStatusName(orderToErase.status)}\nPriority: ${PRIORITIES[orderToErase.priority].name}\nCreated: <t:${Math.floor(orderToErase.createdAt / 1000)}:F>`, inline: false },
                                    { name: 'Data Removed From', value: '• Active queue or history\n• Reviews\n• Dependencies\n• Due dates\n• Statistics', inline: false }
                                )
                                .setTimestamp();

                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }
                } catch (error) {
                    console.error('Error logging order erasure:', error);
                }

                // Notify customer that their order was erased (optional, might be sensitive)
                try {
                    const customer = await client.users.fetch(orderToErase.customerId);
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('📋 Order Status Update')
                        .setColor(0xffa500)
                        .addFields(
                            { name: 'Order Code', value: eraseOrderCode },
                            { name: 'Status Update', value: 'Your order has been removed from our system.' },
                            { name: 'Note', value: 'If you have questions about this change, please contact our staff.' }
                        )
                        .setTimestamp();
                    
                    await customer.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log('Could not notify customer about order erasure:', error);
                }
                break;

            case 'history':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to view order history.', 
                        ephemeral: true 
                    });
                }

                const page = interaction.options.getInteger('page') || 1;
                const customerFilter = interaction.options.getString('customer');
                const priorityFilter = interaction.options.getString('priority');
                const sortOrder = interaction.options.getString('sort') || 'newest';
                
                // Get all completed orders
                let historyOrders = Array.from(orderHistory.values());
                
                if (historyOrders.length === 0) {
                    return interaction.reply({ 
                        content: '📭 No completed orders found in the system history.', 
                        ephemeral: true 
                    });
                }

                // Apply customer filter
                if (customerFilter) {
                    // Extract user ID from mention or use as-is
                    const userId = customerFilter.replace(/[<@!>]/g, '');
                    historyOrders = historyOrders.filter(order => order.customerId === userId);
                    
                    if (historyOrders.length === 0) {
                        return interaction.reply({ 
                            content: `📭 No completed orders found for customer ${customerFilter}.`, 
                            ephemeral: true 
                        });
                    }
                }

                // Apply priority filter
                if (priorityFilter) {
                    historyOrders = historyOrders.filter(order => order.priority === priorityFilter);
                    
                    if (historyOrders.length === 0) {
                        return interaction.reply({ 
                            content: `📭 No completed orders found with ${priorityFilter} priority.`, 
                            ephemeral: true 
                        });
                    }
                }

                // Sort orders
                switch (sortOrder) {
                    case 'oldest':
                        historyOrders.sort((a, b) => a.completedAt - b.completedAt);
                        break;
                    case 'code':
                        historyOrders.sort((a, b) => a.code.localeCompare(b.code));
                        break;
                    case 'newest':
                    default:
                        historyOrders.sort((a, b) => b.completedAt - a.completedAt);
                        break;
                }

                // Pagination
                const ordersPerPage = 8;
                const totalPages = Math.ceil(historyOrders.length / ordersPerPage);
                const startIndex = (page - 1) * ordersPerPage;
                const endIndex = Math.min(startIndex + ordersPerPage, historyOrders.length);
                const ordersToShow = historyOrders.slice(startIndex, endIndex);

                if (page > totalPages) {
                    return interaction.reply({ 
                        content: `📭 Page ${page} doesn't exist. Total pages: ${totalPages}`, 
                        ephemeral: true 
                    });
                }

                // Create embed
                const historyEmbed = new EmbedBuilder()
                    .setTitle('📚 Order History')
                    .setColor(0x0099ff)
                    .setDescription(`Showing completed orders (Page ${page}/${totalPages})`);

                // Add filters info if any
                const filtersApplied = [];
                if (customerFilter) filtersApplied.push(`Customer: <@${customerFilter.replace(/[<@!>]/g, '')}>`);
                if (priorityFilter) filtersApplied.push(`Priority: ${PRIORITIES[priorityFilter].name}`);
                if (filtersApplied.length > 0) {
                    historyEmbed.addFields({ name: 'Filters Applied', value: filtersApplied.join(' • '), inline: false });
                }

                // Add order list
                const historyOrderList = ordersToShow.map((order, index) => {
                    const globalIndex = startIndex + index + 1;
                    const completedDate = new Date(order.completedAt).toLocaleDateString();
                    const processingTime = formatDuration(order.completedAt - order.createdAt);
                    const hasReview = orderReviews.has(order.code);
                    
                    return `**${globalIndex}.** ${getPriorityEmoji(order.priority)} Order **${order.code}** - <@${order.customerId}>\n` +
                           `└ ✅ Completed on ${completedDate}\n` +
                           `└ ⏱️ Processing time: ${processingTime}\n` +
                           `└ ${hasReview ? '⭐ Has review' : '📝 No review'}\n` +
                           `└ ${order.description.substring(0, 80)}${order.description.length > 80 ? '...' : ''}`;
                }).join('\n\n');

                historyEmbed.addFields({ name: `Completed Orders (${historyOrders.length} total)`, value: historyOrderList || 'No orders found' });

                // Add summary statistics
                const avgProcessingTime = historyOrders.length > 0 ? 
                    historyOrders.reduce((sum, order) => sum + (order.completedAt - order.createdAt), 0) / historyOrders.length : 0;
                const historyPriorityCounts = {
                    low: historyOrders.filter(o => o.priority === 'low').length,
                    normal: historyOrders.filter(o => o.priority === 'normal').length,
                    high: historyOrders.filter(o => o.priority === 'high').length,
                    urgent: historyOrders.filter(o => o.priority === 'urgent').length
                };
                const reviewsCount = historyOrders.filter(order => orderReviews.has(order.code)).length;

                historyEmbed.addFields({
                    name: 'Summary Statistics',
                    value: `**Average Processing Time:** ${formatDuration(avgProcessingTime)}\n` +
                           `**Priority Breakdown:** ${historyPriorityCounts.urgent}🔴 ${historyPriorityCounts.high}🟠 ${historyPriorityCounts.normal}🟡 ${historyPriorityCounts.low}🟢\n` +
                           `**Orders with Reviews:** ${reviewsCount}/${historyOrders.length} (${Math.round(reviewsCount/historyOrders.length*100)}%)`,
                    inline: false
                });

                // Navigation info
                if (totalPages > 1) {
                    let navigationText = `Page ${page} of ${totalPages}`;
                    if (page > 1) navigationText += ` • Use \`/history page:${page - 1}\` for previous`;
                    if (page < totalPages) navigationText += ` • Use \`/history page:${page + 1}\` for next`;
                    historyEmbed.setFooter({ text: navigationText });
                }

                historyEmbed.setTimestamp();

                await interaction.reply({ embeds: [historyEmbed], ephemeral: true });
                break;

            case 'generatetoken':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to generate tokens.', 
                        ephemeral: true 
                    });
                }

                const tokenDescription = interaction.options.getString('description');
                const tokenNotes = interaction.options.getString('notes') || '';
                
                const newTokenCode = generateTokenCode();
                const newToken = {
                    code: newTokenCode,
                    description: tokenDescription,
                    notes: tokenNotes,
                    createdAt: Date.now(),
                    createdBy: interaction.user.id,
                    used: false,
                    usedAt: null,
                    usedBy: null,
                    usedInOrder: null
                };

                promotionalTokens.set(newTokenCode, newToken);
                saveOrderData();

                const tokenEmbed = new EmbedBuilder()
                    .setTitle('🎫 Promotional Token Generated')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'Token Code', value: `**${newTokenCode}**`, inline: true },
                        { name: 'Created by', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Status', value: '✅ Available', inline: true },
                        { name: 'Description', value: tokenDescription, inline: false }
                    );

                if (tokenNotes) {
                    tokenEmbed.addFields({ name: 'Notes', value: tokenNotes, inline: false });
                }

                tokenEmbed.addFields({ 
                    name: 'Instructions', 
                    value: '• Write this code on the back of your promotional token\n• Customers can use this token when placing orders\n• Use `/checktoken` to verify token status', 
                    inline: false 
                })
                .setFooter({ text: 'Token ready for distribution' })
                .setTimestamp();

                await interaction.reply({ embeds: [tokenEmbed], ephemeral: true });
                break;

            case 'checktoken':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to check tokens.', 
                        ephemeral: true 
                    });
                }

                const checkTokenCode = interaction.options.getString('token_code').toUpperCase();
                const tokenToCheck = promotionalTokens.get(checkTokenCode);

                if (!tokenToCheck) {
                    return interaction.reply({ 
                        content: `❌ Token \`${checkTokenCode}\` not found in the system.`, 
                        ephemeral: true 
                    });
                }

                const checkEmbed = new EmbedBuilder()
                    .setTitle('🎫 Token Status Check')
                    .setColor(tokenToCheck.used ? 0xff0000 : 0x00ff00)
                    .addFields(
                        { name: 'Token Code', value: `**${tokenToCheck.code}**`, inline: true },
                        { name: 'Status', value: tokenToCheck.used ? '❌ Used' : '✅ Available', inline: true },
                        { name: 'Created by', value: `<@${tokenToCheck.createdBy}>`, inline: true },
                        { name: 'Created', value: `<t:${Math.floor(tokenToCheck.createdAt / 1000)}:F>`, inline: true },
                        { name: 'Description', value: tokenToCheck.description, inline: false }
                    );

                if (tokenToCheck.notes) {
                    checkEmbed.addFields({ name: 'Notes', value: tokenToCheck.notes, inline: false });
                }

                if (tokenToCheck.used) {
                    checkEmbed.addFields(
                        { name: 'Used by', value: `<@${tokenToCheck.usedBy}>`, inline: true },
                        { name: 'Used in Order', value: tokenToCheck.usedInOrder, inline: true },
                        { name: 'Used Date', value: `<t:${Math.floor(tokenToCheck.usedAt / 1000)}:F>`, inline: true }
                    );
                }

                checkEmbed.setTimestamp();

                await interaction.reply({ embeds: [checkEmbed], ephemeral: true });
                break;

            case 'removetoken':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to remove tokens.', 
                        ephemeral: true 
                    });
                }

                const removeTokenCode = interaction.options.getString('token_code').toUpperCase();
                const removeReason = interaction.options.getString('reason');
                const tokenToRemove = promotionalTokens.get(removeTokenCode);

                if (!tokenToRemove) {
                    return interaction.reply({ 
                        content: `❌ Token \`${removeTokenCode}\` not found in the system.`, 
                        ephemeral: true 
                    });
                }

                // Remove the token
                promotionalTokens.delete(removeTokenCode);
                saveOrderData();

                const tokenRemoveEmbed = new EmbedBuilder()
                    .setTitle('🗑️ Token Removed')
                    .setColor(0xff0000)
                    .addFields(
                        { name: 'Token Code', value: `**${removeTokenCode}**`, inline: true },
                        { name: 'Removed by', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Was Used', value: tokenToRemove.used ? 'Yes' : 'No', inline: true },
                        { name: 'Original Description', value: tokenToRemove.description, inline: false },
                        { name: 'Removal Reason', value: removeReason, inline: false }
                    )
                    .setFooter({ text: 'Token permanently removed from system' })
                    .setTimestamp();

                await interaction.reply({ embeds: [tokenRemoveEmbed], ephemeral: true });
                break;

            case 'listtokens':
                if (!hasAdminPermissions(interaction.member)) {
                    return interaction.reply({ 
                        content: '❌ You don\'t have permission to list tokens.', 
                        ephemeral: true 
                    });
                }

                const statusFilter = interaction.options.getString('status') || 'all';
                let tokensToShow = Array.from(promotionalTokens.values());

                // Apply status filter
                if (statusFilter === 'available') {
                    tokensToShow = tokensToShow.filter(token => !token.used);
                } else if (statusFilter === 'used') {
                    tokensToShow = tokensToShow.filter(token => token.used);
                }

                if (tokensToShow.length === 0) {
                    return interaction.reply({ 
                        content: `📭 No tokens found with status: ${statusFilter}`, 
                        ephemeral: true 
                    });
                }

                // Sort by creation date (newest first)
                tokensToShow.sort((a, b) => b.createdAt - a.createdAt);

                const listEmbed = new EmbedBuilder()
                    .setTitle('🎫 Promotional Tokens List')
                    .setColor(0x0099ff)
                    .setDescription(`Showing ${statusFilter} tokens (${tokensToShow.length} found)`);

                // Show first 10 tokens
                const tokensToDisplay = tokensToShow.slice(0, 10);
                const tokenList = tokensToDisplay.map(token => {
                    const status = token.used ? '❌ Used' : '✅ Available';
                    const createdDate = new Date(token.createdAt).toLocaleDateString();
                    const usedInfo = token.used ? ` | Used in ${token.usedInOrder}` : '';
                    
                    return `**${token.code}** - ${status}\n└ ${token.description.substring(0, 60)}${token.description.length > 60 ? '...' : ''}\n└ Created: ${createdDate}${usedInfo}`;
                }).join('\n\n');

                listEmbed.addFields({ name: 'Tokens', value: tokenList || 'No tokens found' });

                // Add summary
                const totalTokens = promotionalTokens.size;
                const usedTokens = Array.from(promotionalTokens.values()).filter(t => t.used).length;
                const availableTokens = totalTokens - usedTokens;

                listEmbed.addFields({
                    name: 'Summary',
                    value: `**Total:** ${totalTokens} | **Available:** ${availableTokens} | **Used:** ${usedTokens}`,
                    inline: false
                });

                if (tokensToShow.length > 10) {
                    listEmbed.setFooter({ text: `Showing first 10 of ${tokensToShow.length} tokens` });
                }

                listEmbed.setTimestamp();

                await interaction.reply({ embeds: [listEmbed], ephemeral: true });
                break;

            default:
                await interaction.reply({ content: 'Unknown command!', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

// Error handling
client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

client.on('warn', warning => {
    console.warn('⚠️ Discord client warning:', warning);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

module.exports = { client, commands };
