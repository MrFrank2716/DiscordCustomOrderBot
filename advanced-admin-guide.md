# Advanced Admin Commands Guide

## Overview
This guide covers the advanced administrative commands available in the Order Management Bot for managing order history, system maintenance, and comprehensive order oversight.

## 📚 History Management

### `/history` - View Order History
View all completed orders with advanced filtering and pagination options.

**Usage:**
```
/history [page:1] [customer:@user] [priority:normal] [sort:newest]
```

**Parameters:**
- `page` (optional): Page number to view (default: 1)
- `customer` (optional): Filter by specific customer (user mention or ID)
- `priority` (optional): Filter by priority (low, normal, high, urgent)
- `sort` (optional): Sort order (newest, oldest, code)

**Features:**
- **Pagination**: 8 orders per page with navigation instructions
- **Customer Filtering**: View all orders from a specific customer
- **Priority Filtering**: Filter by order priority level
- **Multiple Sort Options**: Sort by completion date or order code
- **Summary Statistics**: Average processing time, priority breakdown, review completion rate
- **Review Status**: Shows which orders have customer reviews

**Examples:**
```
/history page:2
/history customer:@customer123 priority:urgent
/history sort:oldest
/history customer:1234567890 page:3
```

**What You'll See:**
- Order code, customer, completion date
- Processing time for each order
- Review status (⭐ has review, 📝 no review)
- Priority indicators with emojis
- Truncated order descriptions
- Summary statistics for the filtered results

## 🗑️ System Maintenance

### `/eraseorder` - Permanent Order Deletion
**⚠️ USE WITH EXTREME CAUTION** - Completely removes an order from all system records.

**Usage:**
```
/eraseorder order_code:ED001 reason:"Duplicate test order" confirm:true
```

**Parameters:**
- `order_code` (required): The order code to permanently delete
- `reason` (required): Reason for deletion (for logging purposes)
- `confirm` (required): Must be set to `true` to confirm deletion

**What Gets Deleted:**
- Order from active queue OR history
- All reviews associated with the order
- All dependencies involving this order
- Due date information
- Removes order from other orders' dependencies
- Updates completion statistics if needed

**Safety Features:**
- **Double Confirmation**: Must explicitly set confirm to true
- **Comprehensive Logging**: All deletions are logged with full details
- **Admin Only**: Only users with admin permissions can use this command
- **Audit Trail**: Logs who deleted what and why

**When to Use:**
- Duplicate orders created by mistake
- Test orders that should not be in production data
- Orders created with incorrect information that need complete removal
- Data cleanup for system maintenance

**⚠️ Important Notes:**
- **This action cannot be undone**
- **Customer will be notified** that their order was removed
- **All associated data is permanently lost**
- **Use `/removeorder` instead** if you just want to remove from active queue

## 🧾 Receipt System

### `/sendreceipt` - Professional Receipt Delivery
Send professional receipts to customers via both email and Discord DM.

**Usage:**
```
/sendreceipt order_code:ED001 customer_email:customer@example.com subtotal:50.00 tax:10.00 payment_method:"Credit Card"
```

**Parameters:**
- `order_code` (required): Completed order code
- `customer_email` (required): Customer's email address
- `subtotal` (optional): Order subtotal amount
- `tax` (optional): Tax/VAT amount
- `payment_method` (optional): Payment method used

**Delivery Methods:**
1. **Email Receipt**: Professional HTML receipt with full branding
2. **Discord DM**: Rich embed receipt with order details

**Receipt Content:**
- Complete order information and timeline
- Processing time and completion date
- Pricing breakdown (if provided)
- Customer information and order description
- Professional branding and formatting
- Links to original order attachments

**Error Handling:**
- Validates email format before sending
- Continues if one delivery method fails
- Reports success/failure for each method
- Logs all receipt sending for audit purposes

## 🏷️ Label Printing

### `/printlabel` - Physical Label Generation
Generate and email order labels directly to your printer.

**Usage:**
```
/printlabel order_code:ED001
```

**Features:**
- **4" x 6" Label Format**: Standard shipping label size
- **Professional Design**: Clean, scannable layout
- **Order Information**: Code, customer, priority, status, position
- **QR Code Placeholder**: Ready for future barcode integration
- **Email Delivery**: Sent directly to configured printer email

**Label Content:**
- Large, bold order code
- Customer information
- Current queue position
- Priority and status indicators
- Order description (truncated)
- Creation and due dates
- QR code placeholder for scanning

## 📊 Best Practices

### Order History Management
1. **Regular Reviews**: Use `/history` weekly to review completion patterns
2. **Customer Analysis**: Filter by customer to track repeat business
3. **Performance Metrics**: Monitor average processing times by priority
4. **Review Follow-up**: Check which orders lack customer reviews

### System Maintenance
1. **Careful Deletion**: Only use `/eraseorder` for genuine mistakes
2. **Document Reasons**: Always provide clear deletion reasons
3. **Backup Important Orders**: Consider manual backup before deletion
4. **Regular Cleanup**: Remove test orders promptly

### Receipt Management
1. **Complete Information**: Include pricing when available
2. **Verify Email Addresses**: Double-check customer emails
3. **Prompt Delivery**: Send receipts shortly after completion
4. **Follow Up**: Check if customers received receipts

### Label Printing
1. **Print Early**: Generate labels when orders start processing
2. **Quality Control**: Verify printer email configuration
3. **Batch Printing**: Consider printing multiple labels at once
4. **Label Tracking**: Use labels to track physical order progress

## 🔧 Troubleshooting

### History Command Issues
- **No Results**: Check if any orders are actually completed
- **Filtering Problems**: Verify customer IDs and priority names
- **Page Errors**: Ensure page number is within valid range

### Erase Order Problems
- **Permission Denied**: Verify admin role configuration
- **Order Not Found**: Check if order code exists and spelling is correct
- **Confirmation Failed**: Must explicitly set confirm parameter to true

### Receipt Delivery Issues
- **Email Failures**: Check SMTP configuration in .env file
- **DM Failures**: Customer may have DMs disabled
- **Invalid Email**: Verify email format is correct

### Label Printing Problems
- **Printer Not Receiving**: Check printer email configuration
- **Email Failures**: Verify SMTP settings and credentials
- **Format Issues**: Ensure printer supports HTML email content

## 🛡️ Security Considerations

### Access Control
- All commands require admin permissions
- Sensitive operations are logged comprehensively
- Customer notifications maintain professionalism
- Audit trails are maintained for all major actions

### Data Protection
- Email addresses are not permanently stored
- Order data is handled according to privacy requirements
- Deletion operations are irreversible by design
- Logging includes sufficient detail for accountability

### Operational Security
- Confirm all deletions before executing
- Verify recipient information before sending receipts
- Monitor logs for unusual activity
- Backup important data before major cleanups
