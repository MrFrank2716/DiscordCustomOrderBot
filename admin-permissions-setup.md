# 🔒 Admin Permissions Setup Guide

The bot now uses role-based permissions instead of Discord's built-in permissions. This prevents members with broad permissions from accessing admin commands.

## 🚀 Quick Setup Steps

### Step 1: Deploy Updated Commands
```bash
node deploy-commands.js
```

### Step 2: Find Your Admin Role ID
1. Start the bot: `node bot.js`
2. In Discord, run: `/roleinfo`
3. This will show you all server roles and their IDs
4. Copy the ID of the role you want to use for admins

### Step 3: Update Your .env File
Add the role ID to your `.env` file:
```properties
# Admin Role ID (Users with this role can use admin commands)
ADMIN_ROLE_ID=1234567890123456789

# Staff Role ID (Alternative role for admin permissions - optional)
STAFF_ROLE_ID=9876543210987654321
```

### Step 4: Restart the Bot
```bash
# Stop the bot (Ctrl+C if running)
# Then restart:
node bot.js
```

## 🔐 How It Works Now

### Admin Commands (Require Admin/Staff Role)
- `/createorder` - Create new orders
- `/complete` - Mark orders complete
- `/updatestatus` - Update order status
- `/removeorder` - Remove orders from queue
- `/moveorder` - Change order position
- `/rush` - Mark orders as urgent
- `/bulkcomplete` - Complete multiple orders
- `/setduedate` - Set due dates
- `/adddependency` - Add order dependencies
- `/savedata` - Manual data save
- `/roleinfo` - View role IDs (for setup)

### Customer Commands (Everyone Can Use)
- `/findorder` - Find specific orders
- `/position` - Check queue position
- `/orderstatus` - Check order status
- `/myorders` - View your orders
- `/queue` - View current queue
- `/overdue` - View overdue orders

### Permission Priority (Highest to Lowest)
1. **Discord Administrator Permission** - Always has access
2. **Admin Role** - Set via `ADMIN_ROLE_ID` in .env
3. **Staff Role** - Set via `STAFF_ROLE_ID` in .env (optional)
4. **Regular Members** - Customer commands only

## 🛠️ Troubleshooting

### Problem: Members still have admin access
- **Solution**: Make sure you updated the `.env` file and restarted the bot

### Problem: Legitimate admins can't use commands
- **Solution**: 
  1. Run `/roleinfo` to get the correct role ID
  2. Make sure the role ID is correctly set in `.env`
  3. Restart the bot

### Problem: @everyone can still use admin commands
- **Solution**: Check that users don't have Discord's "Administrator" permission, as this bypasses role checks

### Problem: Can't run `/roleinfo`
- **Solution**: You need Discord Administrator permission or be the server owner to run this command initially

## 🔧 Manual Role ID Finding
If `/roleinfo` doesn't work, you can find role IDs manually:
1. In Discord, go to Server Settings → Roles
2. Right-click on any role → Copy ID
3. If "Copy ID" isn't showing, enable Developer Mode in Discord Settings → Advanced

## ✅ Testing
After setup:
1. Have a regular member try `/createorder` - should be denied
2. Have someone with the admin role try `/createorder` - should work
3. Anyone should be able to use `/queue` or `/myorders`

---
*The bot is now secure and only allows designated roles to use admin commands!*
