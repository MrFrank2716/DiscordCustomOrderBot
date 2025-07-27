const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
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
        
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersObject, null, 2));
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyObject, null, 2));
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviewsObject, null, 2));
        fs.writeFileSync(STATS_FILE, JSON.stringify(orderStatistics, null, 2));
        fs.writeFileSync(DEPENDENCIES_FILE, JSON.stringify(dependenciesObject, null, 2));
        fs.writeFileSync(DUE_DATES_FILE, JSON.stringify(dueDatesObject, null, 2));
        fs.writeFileSync(ORDER_COUNTER_FILE, JSON.stringify({ currentOrderNumber }, null, 2));
        
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
                .setRequired(false))
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
                    )
                    .setTimestamp();

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
                            { name: 'Ticket Thread', value: orderToComplete.threadLink || 'No thread linked' }
                        )
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
                        { name: 'Ticket Thread', value: statusOrder.threadLink || 'No thread linked' }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
                break;

            case 'myorders':
                const myOrders = Array.from(orderQueue.values()).filter(order => order.customerId === interaction.user.id);
                
                if (myOrders.length === 0) {
                    return interaction.reply({ 
                        content: '📭 You don\'t have any orders in the queue.', 
                        ephemeral: true 
                    });
                }

                const myOrdersEmbed = new EmbedBuilder()
                    .setTitle('📋 Your Current Orders')
                    .setColor(0x0099ff)
                    .setDescription(`You have ${myOrders.length} order(s) in the queue`)
                    .setTimestamp();

                const myOrdersList = myOrders.map(order => {
                    const position = getOrderPosition(order.code);
                    const timeAgo = Math.floor((Date.now() - order.createdAt) / (1000 * 60 * 60 * 24));
                    return `**Order ${order.code}** - Position: ${position}\n` +
                           `${getStatusEmoji(order.status)} ${getStatusName(order.status)}\n` +
                           `${getPriorityEmoji(order.priority)} ${PRIORITIES[order.priority].name} Priority\n` +
                           `Created ${timeAgo > 0 ? `${timeAgo} day(s) ago` : 'today'}\n` +
                           `${order.description.substring(0, 150)}${order.description.length > 150 ? '...' : ''}`;
                }).join('\n\n');

                myOrdersEmbed.addFields({ name: 'Orders', value: myOrdersList });
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
