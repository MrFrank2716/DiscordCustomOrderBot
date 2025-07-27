# Discord Custom Order Bot

A Discord bot designed to help track and process orders through your Discord server, integrating with existing ticket systems like TicketTool.

## Features

### Core Order Management Commands
- **`/createorder`** - Create a new order from a ticket using interactive dropdown menus (supports file attachments)
- **`/queue`** - View all current orders in the queue with priorities and statuses
- **`/complete`** - Mark an order as complete and remove it from the queue
- **`/updatestatus`** - Update the status of an existing order using dropdown menu
- **`/removeorder`** - Remove an order from the queue (Admin only)
- **`/findorder`** - Get a direct link to an order's ticket thread
- **`/eraseorder`** - Permanently erase an order from the entire system (Admin only - USE WITH CAUTION)

### Advanced Queue Management (Admin Only)
- **`/moveorder`** - Move an order to a specific position in the queue
- **`/rush`** - Mark an order as urgent/expedited and move to front of queue
- **`/bulkcomplete`** - Complete multiple orders at once using comma-separated order codes

### Analytics & Reporting
- **`/stats`** - View comprehensive order queue statistics and metrics
- **`/overdue`** - View orders that are past their due dates
- **`/history`** - View all completed orders with filtering and pagination (Admin only)

### Order Scheduling & Dependencies
- **`/setduedate`** - Set a due date for an order (YYYY-MM-DD format)
- **`/adddependency`** - Create dependencies between orders
- **`/overdue`** - View orders that are past their due dates

### Label Printing & Physical Management
- **`/printlabel`** - Generate and email professional order labels to printer (Admin only)

### Receipt System
- **`/sendreceipt`** - Send professional receipts to customers via email and Discord DM (Admin only)

### Customer Commands
- **`/position`** - Check your position in the queue
- **`/orderstatus`** - Check the detailed status of a specific order
- **`/myorders`** - View all your current and completed orders with review status
- **`/review`** - Leave a review for a completed order with rating and optional image

## Key Features

✅ **Sequential Order Numbering** - Orders use linear codes like ED001, ED002, ED003 for easy tracking  
✅ **Professional Label Printing** - Generate and email 4"x6" order labels directly to your printer  
✅ **Professional Receipt System** - Send beautiful HTML receipts via email and Discord DM  
✅ **Customer Review System** - Verified customers can review completed orders with ratings and images  
✅ **Automatic Data Persistence** - All order data is automatically saved after every command  
✅ **Thread-Based Ticket Integration** - No longer moves tickets to categories, uses thread links  
✅ **Priority System** - Orders can be set with different priorities (Low, Normal, High, Urgent)  
✅ **Advanced Status Tracking** - Comprehensive order status system with 8 different statuses  
✅ **Interactive Dropdowns** - User-friendly dropdown menus for order creation and status updates  
✅ **File Attachments** - Support for attaching images and files to orders  
✅ **Order Dependencies** - Link orders that depend on each other with automatic status updates  
✅ **Due Date Management** - Set and track order due dates with overdue alerts  
✅ **Queue Position Tracking** - Customers can check their position in line  
✅ **Order History** - Completed orders are stored in history with completion statistics  
✅ **Smart Notifications** - Automatic alerts for overdue orders and long-pending orders  
✅ **Customer Notifications** - Automatic DM notifications when orders are completed or status changes  
✅ **Real-time Updates** - Status changes are immediately reflected and logged  
✅ **Comprehensive Analytics** - Detailed statistics including completion times by priority  
✅ **Reviews Channel Integration** - Customer reviews are automatically posted to a designated channel  
✅ **Logging** - Comprehensive logging channel for all order actions and alerts  
✅ **Permission System** - Role-based permissions for order management  
✅ **Bulk Operations** - Complete multiple orders simultaneously  
✅ **Manual Queue Management** - Move orders to specific positions when needed  

## Setup Instructions

### 1. Create a Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and create a bot
4. Copy the bot token and save it for later
5. Enable the following bot permissions:
   - Send Messages
   - Use Slash Commands
   - Manage Channels
   - Read Message History
   - Embed Links
   - Attach Files

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
1. Edit the `.env` file and fill in your values:
   - `DISCORD_TOKEN` - Your bot token from step 1
   - `GUILD_ID` - Your Discord server ID
   - `ORDER_CATEGORY_ID` - Category where orders will be moved
   - `LOG_CHANNEL_ID` - (Optional) Channel for logging order actions
   - `REVIEWS_CHANNEL_ID` - (Optional) Channel where customer reviews will be posted
   - `ADMIN_ROLE_ID` - Role ID for users who can use admin commands
   - `STAFF_ROLE_ID` - (Optional) Alternative admin role ID
   - `CLIENT_ID` - Your bot's application ID
   - `PRINTER_EMAIL` - (Optional) Email address of your printer for label printing
   - `SMTP_HOST` - (Optional) SMTP server for email sending (e.g., smtp.gmail.com)
   - `SMTP_PORT` - (Optional) SMTP port (usually 587)
   - `SMTP_USER` - (Optional) Email address for sending labels
   - `SMTP_PASS` - (Optional) Email password/app password

### 4. Deploy Slash Commands
```bash
node deploy-commands.js
```

### 5. Start the Bot

#### Option A: Simple Start (Stops when terminal closes)
```bash
npm start
```

#### Option B: Persistent Start with PM2 (Recommended)
```bash
# Start the bot persistently
npm run pm2:start

# Check bot status
npm run pm2:status

# View bot logs
npm run pm2:logs

# Stop the bot
npm run pm2:stop

# Restart the bot
npm run pm2:restart
```

#### Option C: Windows Batch Manager (Easy GUI)
Double-click `manage-bot.bat` for a menu-driven interface to manage your bot.

## How to Get Discord IDs

### Guild ID (Server ID)
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click your server name and select "Copy Server ID"

### Channel/Category IDs
1. Right-click the channel or category and select "Copy Channel ID"

### User IDs
1. Right-click a user and select "Copy User ID"

## Usage Workflow

1. **Customer opens a ticket** using your existing TicketTool setup
2. **Staff uses `/createorder`** to convert the ticket into an order
   - Bot automatically moves the ticket to the orders category
   - Order gets added to the queue with a unique ID
3. **Staff can view the queue** using `/queue` to see all pending orders
4. **Customers can check their position** using `/position` or `/myorders`
5. **Staff marks orders complete** using `/complete` when finished
   - Customer gets automatically notified via DM
   - Order is moved to history

## Command Details

### Core Commands

### `/createorder`
- **Description**: Create a new order from a ticket
- **Options**:
  - `description` (required) - Description of the order
  - `customer` (optional) - The customer (defaults to command user)
  - `attachment` (optional) - Attach a file/image to the order
- **Interactive Elements**: Priority and status dropdown menus
- **Permissions**: Requires Manage Channels permission

### `/findorder`
- **Description**: Get a direct link to an order's ticket thread
- **Options**:
  - `order_code` (required) - The order code (e.g., ED001)
- **Features**: Shows order details and provides clickable thread link

### `/updatestatus`
- **Description**: Update the status of an existing order
- **Options**:
  - `order_code` (required) - The order code to update
- **Interactive Elements**: Status dropdown with all available statuses
- **Permissions**: Requires Manage Channels permission

### `/queue`
- **Description**: View the current order queue
- **Features**: Shows up to 10 orders, sorted by priority then creation time

### `/complete`
- **Description**: Mark an order as complete
- **Options**:
  - `order_code` (required) - The order code to complete
- **Features**: Checks dependencies before allowing completion
- **Important**: Cannot complete orders that have dependencies - use `/bulkcomplete` instead
- **Permissions**: Requires Manage Channels permission

### Advanced Management Commands

### `/moveorder`
- **Description**: Move an order to a specific position in the queue
- **Options**:
  - `order_code` (required) - The order code to move
  - `position` (required) - New position (1 = first)
- **Permissions**: Requires Manage Channels permission

### `/rush`
- **Description**: Mark an order as urgent and move to front of queue
- **Options**:
  - `order_code` (required) - The order code to rush
- **Features**: Sets priority to urgent and moves to position 1
- **Permissions**: Requires Manage Channels permission

### `/bulkcomplete`
- **Description**: Complete multiple orders at once
- **Options**:
  - `order_codes` (required) - Comma-separated order codes (e.g., ED001,ED002,ED003)
- **Features**: Required for completing orders that have dependencies created with `/adddependency`
- **Permissions**: Requires Manage Channels permission

### `/setduedate`
- **Description**: Set a due date for an order
- **Options**:
  - `order_code` (required) - The order code
  - `due_date` (required) - Due date in YYYY-MM-DD format
- **Permissions**: Requires Manage Channels permission

### `/adddependency`
- **Description**: Add a dependency between orders
- **Options**:
  - `order_code` (required) - The order that depends on another
  - `depends_on` (required) - The order code it depends on
- **Features**: Prevents completion until dependencies are fulfilled
- **Important**: Orders with dependencies cannot be completed individually with `/complete` - they must be completed together using `/bulkcomplete`
- **Permissions**: Requires Manage Channels permission

### Analytics Commands

### `/stats`
- **Description**: View comprehensive order queue statistics
- **Features**: Shows queue overview, status breakdown, priority breakdown, and completion times

### `/overdue`
- **Description**: View orders that are past their due dates
- **Features**: Shows how many days overdue each order is

### `/savedata`
- **Description**: Manually save all order data to JSON files
- **Features**: Forces immediate save of all data, shows save statistics
- **Permissions**: Requires Manage Channels permission

### Customer Commands

### `/position`
- **Description**: Check position in queue
- **Options**:
  - `order_code` (optional) - Specific order code to check
- **Features**: Shows all user orders if no code provided

### `/orderstatus`
- **Description**: Check detailed status of an order
- **Options**:
  - `order_code` (required) - The order code to check
- **Features**: Shows both active and completed orders with thread links

### `/myorders`
- **Description**: View all your current orders
- **Features**: Shows position, status, priority, and creation date for each order

### `/removeorder`
- **Description**: Remove an order from the queue
- **Options**:
  - `order_code` (required) - The order code to remove
- **Permissions**: Requires Manage Channels permission

## Order Status System

Orders now have detailed status tracking throughout their lifecycle:

### Available Statuses
1. ⏳ **Pending** - Order received, waiting to start
2. 📋 **Preparing** - Gathering materials and planning  
3. 🔨 **Manufacturing** - Currently being created
4. 🔍 **Quality Check** - Reviewing and testing
5. 📦 **Ready for Delivery** - Completed and ready for pickup/delivery
6. ✅ **Completed** - Order fulfilled and delivered
7. ❌ **Cancelled** - Order was cancelled
8. ⏸️ **On Hold** - Temporarily paused

### Status Features
- **Real-time Updates**: Use `/updatestatus` to change order status with dropdown menus
- **Customer Notifications**: Customers are automatically notified when their order status changes
- **Status History**: All status changes are logged with timestamps
- **Visual Indicators**: Each status has a unique emoji for easy identification

## Priority System

Orders are sorted by priority and then by creation time:
1. 🔴 **Urgent** - Highest priority
2. 🟠 **High** - High priority  
3. 🟡 **Normal** - Default priority
4. 🟢 **Low** - Lowest priority

## Order Dependencies System

### How Dependencies Work
- Use `/adddependency` to link orders that depend on each other
- Orders with dependencies cannot be completed individually
- All linked orders must be completed together using `/bulkcomplete`

### Dependency Rules
1. **Individual Completion Blocked**: Orders with dependencies will be rejected if you try to complete them with `/complete`
2. **Bulk Completion Required**: Use `/bulkcomplete` with all related order codes to complete dependent orders
3. **Automatic Status Updates**: When dependencies are fulfilled, dependent orders automatically update to "Ready" status
4. **Customer Notifications**: Customers are notified when their dependent order becomes ready

### Example Workflow
```
1. Create orders ED001, ED002, ED003
2. Link them: /adddependency order_code:ED002 depends_on:ED001
3. Link them: /adddependency order_code:ED003 depends_on:ED001
4. Complete all together: /bulkcomplete order_codes:ED001,ED002,ED003
```

## Data Storage

The bot now uses **JSON file persistence** for reliable data storage:

### How it Works
- **Automatic Saving**: Data is saved every 5 minutes and after major operations
- **Startup Loading**: All data is loaded when the bot starts
- **Graceful Shutdown**: Data is saved when the bot shuts down
- **Fast Performance**: Uses in-memory storage for speed with file backups

### Data Files (in `/data/` folder)
- `orders.json` - Current active orders
- `history.json` - Completed order history  
- `statistics.json` - Analytics and performance data
- `dependencies.json` - Order dependency relationships
- `due_dates.json` - Order due date tracking

### Manual Data Management
- **`/savedata`** - Force save all data immediately (Admin only)
- **Auto-backup**: Files are saved automatically every 5 minutes
- **Safe Shutdown**: Data is preserved when bot restarts

### Backup Recommendations
- **Regular Backups**: Copy the `/data/` folder regularly
- **Cloud Storage**: Consider syncing `/data/` to Google Drive, Dropbox, etc.
- **Version Control**: The data files are excluded from git for security

### Migration from Memory-Only
- Existing data will be preserved when upgrading
- First startup will create empty data files if none exist
- No data loss during the transition

## Running the Bot Persistently

### Why Use PM2?
PM2 is a production process manager that keeps your bot running 24/7:
- **Auto-restart** if the bot crashes
- **Memory monitoring** and automatic restarts if memory usage gets too high
- **Log management** with automatic log rotation
- **Startup scripts** to automatically start the bot when your computer boots

### PM2 Commands
```bash
# Start bot persistently
npm run pm2:start

# Check if bot is running
npm run pm2:status

# View real-time logs
npm run pm2:logs

# Stop the bot
npm run pm2:stop

# Restart the bot
npm run pm2:restart
```

### Auto-start on System Boot
To make your bot start automatically when your computer turns on:
```bash
# Save current PM2 processes
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions shown (usually involves running a command as administrator)
```

### Windows Service Alternative
You can also run the bot as a Windows Service using tools like:
- **NSSM (Non-Sucking Service Manager)**
- **WinSW (Windows Service Wrapper)**

### Cloud Hosting Options
For 24/7 uptime without keeping your computer on:
- **Heroku** (free tier available)
- **Railway** (simple deployment)
- **DigitalOcean** (VPS hosting)
- **AWS EC2** (free tier available)
- **Google Cloud Platform** (free credits available)

## Customization

### Permissions
Modify the permission checks in `bot.js` to match your server's role structure:
```javascript
// Example: Check for specific role instead of Manage Channels
if (!interaction.member.roles.cache.has('YOUR_ROLE_ID')) {
    // Handle permission denial
}
```

### Priority Colors
Customize priority colors and emojis in the `getPriorityEmoji()` function.

### Embed Styling
Modify the embed colors and styling throughout the code to match your server's theme.

## Troubleshooting

### Bot not responding to commands
1. Ensure the bot has proper permissions in your server
2. Check that slash commands are deployed: `node deploy-commands.js`
3. Verify the bot token and IDs in your `.env` file

### Commands not showing up
1. Wait up to 1 hour for global commands, or use guild-specific deployment
2. Make sure the bot has the "applications.commands" scope

### Permission errors
1. Verify the bot has "Manage Channels" permission
2. Check that users have the required permissions to use admin commands

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify your `.env` configuration
3. Ensure all dependencies are installed with `npm install`

## License

MIT License - See LICENSE file for details.
