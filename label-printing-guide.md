# 🖨️ Order Label Printing System

## Overview
The Order Label Printing System generates professional order labels and sends them directly to your email-enabled printer. Perfect for physical order management, inventory tracking, and workflow organization.

## 📋 Features

### ✨ Label Content
- **Order Code** - Large, prominent display (ED001, ED002, etc.)
- **Priority & Status** - Color-coded badges for quick identification
- **Customer Information** - Customer name and order position
- **Dates** - Created date and due date (if set)
- **Description** - Full order description in dedicated section
- **QR Code Placeholder** - Space for future QR code integration
- **Professional Layout** - 4" x 6" format optimized for standard label printers

### 🎨 Visual Features
- **Color-coded Priority Levels**:
  - 🔴 Urgent: Red
  - 🟡 High: Yellow  
  - 🔵 Normal: Blue
  - 🟢 Low: Green

- **Status Color Coding**:
  - Pending: Gray
  - Preparing: Cyan
  - Manufacturing: Orange
  - Quality Check: Teal
  - Ready: Green
  - Shipped: Purple
  - On Hold: Yellow
  - Cancelled: Red

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
npm install nodemailer
```

### Step 2: Configure Email Settings
Add these settings to your `.env` file:

```properties
# Email-to-Print Configuration
PRINTER_EMAIL=your.printer@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your.app.password
```

### Step 3: Email Provider Setup

#### For Gmail:
1. Enable 2-Factor Authentication
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `SMTP_PASS`

#### For Other Providers:
- **Outlook**: `smtp-mail.outlook.com`, port 587
- **Yahoo**: `smtp.mail.yahoo.com`, port 587
- **Custom SMTP**: Use your provider's settings

### Step 4: Printer Configuration
1. **Find your printer's email address**:
   - HP: Usually found in printer settings or HP Smart app
   - Canon: Check printer menu or Canon app
   - Epson: Look in Epson Connect settings
   - Brother: Check iPrint&Scan app

2. **Add printer email to PRINTER_EMAIL** in .env file

3. **Test email printing** by sending a test email to your printer

### Step 5: Deploy and Test
```bash
node deploy-commands.js
node bot.js
```

## 💻 Usage

### Admin Command
```
/printlabel order_code:ED001
```

### What Happens:
1. Bot generates professional HTML label
2. Label is emailed to your printer
3. Printer receives and prints the label automatically
4. Confirmation message shows in Discord
5. Action is logged for tracking

### Label Information Included:
- ✅ Order code (large and prominent)
- ✅ Customer information
- ✅ Priority and status with colors
- ✅ Queue position
- ✅ Created date and due date
- ✅ Full order description
- ✅ Generation timestamp
- ✅ QR code placeholder

## 🎯 Use Cases

### Workshop Management
- Print labels when starting work on orders
- Attach to physical items or project folders
- Track progress visually in workspace

### Inventory Tracking
- Label completed items before storage
- Organize by priority or customer
- Quick visual identification

### Shipping & Fulfillment
- Generate shipping labels
- Include customer and order details
- Streamline packaging process

### Quality Control
- Track orders through different stages
- Visual status indication
- Easy handoff between team members

## 🔧 Troubleshooting

### Problem: Email not sending
**Solutions**:
- Check SMTP credentials in .env file
- Verify app password (for Gmail)
- Test email manually to printer
- Check firewall/antivirus blocking

### Problem: Printer not receiving emails
**Solutions**:
- Verify printer email address
- Check printer's email settings
- Ensure printer is connected to internet
- Check printer's inbox/queue

### Problem: Labels not formatted correctly
**Solutions**:
- Printer may need HTML email support
- Try different email format settings
- Check printer manual for email specifications

### Problem: "Printer email not configured" error
**Solution**:
- Add PRINTER_EMAIL and SMTP settings to .env
- Restart the bot after configuration

## 📊 Advanced Features

### Future Enhancements
- **QR Code Generation**: Automatic QR codes for order tracking
- **Batch Printing**: Print multiple labels at once
- **Custom Templates**: Different label layouts
- **Barcode Support**: Standard barcode generation
- **Print Queue**: Queue multiple print jobs

### Integration Ideas
- **Auto-print on status change**: Automatic labels when orders reach certain stages
- **Customer pickup labels**: Special labels for customer pickup orders
- **Shipping integration**: Connect with shipping label APIs

## 🔐 Security Notes

### Email Security
- Use app passwords, not main account passwords
- Keep SMTP credentials secure
- Consider dedicated email account for printing
- Monitor printer email for unauthorized access

### Printer Security
- Secure your printer's email settings
- Limit who can send to printer email
- Regular printer firmware updates
- Monitor printer access logs

---
*Professional order labels help streamline your workflow and improve organization!*
