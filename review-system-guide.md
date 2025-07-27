# 🌟 Order Review System Documentation

## Overview
The Order Review System allows customers to leave reviews for completed orders. Reviews include ratings, comments, optional images, and are automatically posted to a dedicated reviews channel.

## 📋 Features

### ✅ What's New
- **Linear Order Numbering**: Orders now use sequential numbers (ED001, ED002, ED003, etc.)
- **Automatic Data Saving**: All order commands now automatically save data
- **Customer Reviews**: Customers can review completed orders
- **Review Verification**: Only verified customers who placed orders can review them
- **Reviews Channel**: Reviews are automatically posted to a designated channel
- **One Review Per Order**: Prevents duplicate reviews for the same order

### 🔢 Order Numbering Changes
- **Before**: Random numbers (ED247, ED038, ED891)
- **Now**: Sequential numbers (ED001, ED002, ED003)
- **Persistence**: Order counter is saved and continues after bot restart
- **No Duplicates**: Guaranteed unique order numbers

## 🚀 Setup Instructions

### Step 1: Update Environment Variables
Add the reviews channel ID to your `.env` file:
```properties
# Reviews Channel ID (Where completed order reviews will be posted)
REVIEWS_CHANNEL_ID=your_reviews_channel_id_here
```

### Step 2: Deploy Updated Commands
```bash
node deploy-commands.js
```

### Step 3: Find Your Reviews Channel ID
1. In Discord, right-click on your reviews channel
2. Select "Copy ID" (enable Developer Mode if needed)
3. Paste the ID into your `.env` file

### Step 4: Restart the Bot
```bash
node bot.js
```

## 📝 How to Use Reviews

### For Customers
1. **Complete an order first** - You can only review completed orders
2. **Use the review command**:
   ```
   /review order_code:ED001 rating:5 comment:Great work, very satisfied!
   ```
3. **Optional image**: Attach an image to showcase the completed work
4. **One review per order**: Each order can only be reviewed once

### For Admins
- Reviews automatically appear in the designated reviews channel
- Each review includes:
  - Order code and customer
  - Star rating (1-5 stars)
  - Customer comment
  - Order description
  - Optional customer image
  - Review number and timestamp

## 🔒 Review Validation

### Requirements
- ✅ Order must be completed (in orderHistory)
- ✅ Customer must be the original order placer
- ✅ Order cannot already have a review
- ✅ Rating must be 1-5 stars
- ✅ Comment is required

### Error Messages
- `❌ Order ED001 not found in completed orders` - Order doesn't exist or isn't completed
- `❌ You can only review orders that you placed` - Wrong customer trying to review
- `❌ Order ED001 has already been reviewed` - Duplicate review attempt

## 📊 Data Storage

### New Files Created
- `data/reviews.json` - Stores all customer reviews
- `data/order_counter.json` - Stores current order number

### Review Data Structure
```json
{
  "ED001": {
    "orderCode": "ED001",
    "customerId": "123456789012345678",
    "customerTag": "customer#1234",
    "rating": 5,
    "comment": "Excellent work!",
    "createdAt": 1640995200000,
    "image": {
      "name": "result.jpg",
      "url": "https://discord.com/...",
      "contentType": "image/jpeg"
    }
  }
}
```

## 🛠️ Commands Reference

### Customer Commands
- `/review order_code rating comment [image]` - Leave a review for completed order

### Admin Commands (unchanged)
- All existing admin commands work the same
- Data is automatically saved after every command

## 📈 Benefits

### For Customers
- ⭐ Share feedback and satisfaction
- 📸 Show off completed work
- 🔍 Build trust with future customers

### For Business
- 📊 Track customer satisfaction
- 🌟 Showcase quality work publicly
- 📈 Build reputation and credibility
- 🔄 Improve service based on feedback

### For Admins
- 📝 No manual review management needed
- 🤖 Automatic posting to reviews channel
- 🛡️ Built-in validation prevents abuse
- 💾 All data automatically saved

## 🔧 Troubleshooting

### Problem: Reviews not posting to channel
**Solution**: 
1. Check `REVIEWS_CHANNEL_ID` in `.env` file
2. Ensure bot has permission to send messages in that channel
3. Restart the bot after changing `.env`

### Problem: Customer can't review their order
**Solutions**:
- Ensure order is completed (shows in `/queue` as completed)
- Check customer is using correct order code
- Verify customer placed the original order

### Problem: Order numbers reset after restart
**Solution**: 
- Check if `data/order_counter.json` file exists
- Ensure bot has write permissions to `data/` folder

### Problem: Data not saving
**Solution**:
- Check console for error messages
- Ensure `data/` folder has write permissions
- Try manual save with `/savedata` command

## 🔍 Monitoring Reviews

### Check Review Statistics
Use existing `/stats` command to see overall order statistics.

### View All Reviews
- Check the reviews channel for public reviews
- Admin can access `data/reviews.json` file directly

### Review Analytics Ideas
Future enhancements could include:
- Average rating display
- Review count in statistics
- Best/worst rated orders
- Customer satisfaction trends

---
*The review system enhances customer engagement and helps build business reputation through authentic customer feedback!*
