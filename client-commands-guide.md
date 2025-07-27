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
- Displays position, status, and priority for each
- Quick overview of everything you have pending

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
- `/removeorder` - Only staff can remove orders
- `/moveorder`, `/rush`, `/bulkcomplete` - Queue management
- `/setduedate`, `/adddependency` - Order scheduling
- `/savedata` - Data management

## ❓ **Need Help?**
If you need assistance with your order or have questions, please contact a staff member directly. They can help you with order creation, updates, and any issues you might encounter!

---
*This bot helps manage our order queue efficiently. Thank you for your patience!* 🙏
