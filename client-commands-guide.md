# 📋 How to Use Order Bot Commands - Customer Guide

## 🔍 **Finding Your Orders**

### `/findorder` - Find a specific order
**Usage:** `/findorder order_code:ED001`
- Get a direct link to your order's ticket thread
- View order details and current status
- Works for both active and completed orders

### `/position` - Check your queue position
**Usage:** `/position order_code:ED001` (optional)
- **With order code:** Shows specific order's position in queue
- **Without order code:** Shows ALL your orders and their positions

### `/orderstatus` - Check order status
**Usage:** `/orderstatus order_code:ED001`
- View detailed status information
- See when order was created and last updated
- Get estimated completion information

### `/myorders` - View all your orders
**Usage:** `/myorders`
- Shows ALL your current orders in the queue
- Shows your recent completed orders (last 5)
- Displays position, status, and priority for each
- Shows review status (⭐ reviewed, 📝 can review)
- Reminds you about orders you can review

## 📊 **General Information**

### `/queue` - View the current queue
**Usage:** `/queue`
- See the first 10 orders in queue
- Check overall queue status
- View other customers' positions (public command)

### `/overdue` - View overdue orders
**Usage:** `/overdue`
- See which orders are past their due dates
- Public command showing all overdue orders
- Helps you understand queue delays

## 🎫 **Promotional Tokens**

If you have a promotional token from a marketing campaign or special offer:

### Using Your Token
1. **Give your token code to staff** when they create your order
2. **Staff will use:** `/createorder token_code:YOUR_CODE` when setting up your order
3. **Token validation happens automatically** - staff will know if your token is valid
4. **Your token becomes "used"** automatically when your order is completed

### Token Information
- **Tokens are 5-character codes** (like `A1B2C` or `X9Y8Z`)
- **Each token can only be used once** - they cannot be reused
- **Tokens may have expiration dates** - check with staff if you're unsure
- **Staff can verify your token** before creating your order

### If Your Token Doesn't Work
- **Double-check the code** - tokens are case-sensitive
- **Check expiration** - promotional campaigns may have ended
- **Contact staff** - they can verify token status and help resolve issues

## 💡 **Tips for Customers**

✅ **Order codes are always in format:** `ED001`, `ED002`, etc.
✅ **Commands are case-insensitive** - `ed001` works the same as `ED001`
✅ **Most customer commands show results privately** (only you can see them)
✅ **Use `/myorders` for a quick overview** of all your pending work
✅ **Commands work in any channel** where the bot has access

## 🚫 **Commands You Cannot Use**
These commands are **admin-only** and require special permissions:
- `/createorder` - Only staff can create orders
- `/complete` - Only staff can mark orders complete
- `/updatestatus` - Only staff can update order status
- `/removeorder`, `/eraseorder` - Only staff can remove orders
- `/moveorder`, `/rush`, `/bulkcomplete` - Queue management
- `/setduedate`, `/adddependency` - Order scheduling
- `/savedata` - Data management
- `/printlabel` - Only staff can print labels
- `/sendreceipt` - Only staff can send receipts
- `/history` - Only staff can view order history
- `/generatetoken`, `/checktoken`, `/removetoken`, `/listtokens` - Token management

## 🧾 **What About Receipts?**
When your order is completed:
- **You'll be notified** via Discord DM that your order is complete
- **Staff may send you a receipt** via both email and Discord DM
- **Professional receipts** include all order details, pricing (if applicable), and timeline
- **No action needed** from you - receipts are sent by staff when appropriate

## ❓ **Need Help?**
If you need assistance with your order or have questions, please contact a staff member directly. They can help you with order creation, updates, and any issues you might encounter!

---
*This bot helps manage our order queue efficiently. Thank you for your patience!* 🙏
