# Receipt System Guide

## Overview
The Order Management Bot includes a comprehensive receipt system that allows staff to send professional receipts to customers via both email and Discord DM when orders are completed.

## Features
- **Dual Delivery**: Receipts are sent via both email and Discord DM for maximum accessibility
- **Professional HTML Format**: Email receipts are beautifully formatted HTML documents
- **Discord Integration**: Customers receive a formatted embed receipt in their Discord DMs
- **Pricing Support**: Optional pricing information (subtotal, tax, total, payment method)
- **Order Details**: Complete order information including timeline, priority, and description
- **Attachment References**: Links to original order attachments

## Commands

### `/sendreceipt` (Admin Only)
Send a receipt to a customer for a completed order.

**Parameters:**
- `order_code` (required): The order code to send receipt for
- `customer_email` (required): Customer's email address
- `subtotal` (optional): Order subtotal amount
- `tax` (optional): Tax/VAT amount
- `payment_method` (optional): Payment method used (default: "Paid in advance")

**Example:**
```
/sendreceipt order_code:ED001 customer_email:customer@example.com subtotal:50.00 tax:10.00 payment_method:Credit Card
```

## Receipt Content

### Email Receipt (HTML)
- **Professional Design**: Clean, branded HTML layout
- **Complete Order Information**: All order details, timeline, and status
- **Pricing Breakdown**: Detailed pricing if provided
- **Company Branding**: Professional appearance with order management system branding
- **Attachment Download**: Links to original order attachments

### Discord DM Receipt (Embed)
- **Rich Embed Format**: Professional Discord embed with order details
- **Timeline Information**: Creation date, completion date, processing time
- **Pricing Summary**: Pricing information if provided
- **Visual Elements**: Priority and status indicators with emojis
- **Reference Information**: Links back to original ticket thread

## Workflow

### When to Send Receipts
1. **After Order Completion**: Once an order is marked as complete using `/complete`
2. **Customer Request**: When customers request receipts for their records
3. **Business Records**: For accounting and business documentation purposes

### Automatic vs Manual
- **Manual Process**: Currently receipts are sent manually using `/sendreceipt`
- **Customer Notification**: When orders are completed, customers are notified that they may receive a receipt
- **Staff Discretion**: Staff decide when receipts are appropriate based on order value/type

## Configuration

### Email Settings (Required)
Ensure these are set in your `.env` file:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Prerequisites
- Order must be completed (moved to order history)
- Valid customer email address
- SMTP email configuration properly set up
- Customer must be accessible via Discord DM (for DM delivery)

## Error Handling

### Common Issues
1. **Order Not Found**: Only completed orders can have receipts sent
2. **Invalid Email**: Email format validation prevents invalid addresses
3. **Email Configuration**: Proper SMTP settings required
4. **DM Delivery Failure**: Customer may have DMs disabled (email still works)

### Fallback Behavior
- If email fails but DM succeeds: Customer gets Discord receipt
- If DM fails but email succeeds: Customer gets email receipt
- If both fail: Error message to staff member
- Partial success is still logged and reported

## Best Practices

### For Staff
1. **Verify Email**: Double-check customer email addresses
2. **Include Pricing**: Add pricing information when applicable
3. **Professional Communication**: Use appropriate payment method descriptions
4. **Follow Up**: Check if customer received receipt if delivery partially fails

### For Customers
1. **Check Spam Folder**: HTML emails may be filtered
2. **Enable DMs**: Allow DMs from server members to receive Discord receipts
3. **Save Receipts**: Keep both email and Discord versions for records
4. **Contact Support**: Reach out if receipts are not received

## Security & Privacy

### Data Protection
- Email addresses are only used for receipt delivery
- No email addresses are stored permanently
- Receipts contain only order-specific information
- Customer Discord IDs are used for DM delivery

### Access Control
- Only admin/staff members can send receipts
- Receipts can only be sent for completed orders
- All receipt sending is logged for audit purposes

## Troubleshooting

### Receipt Not Received
1. Check email spam/junk folder
2. Verify email address was entered correctly
3. Check if customer has DMs enabled
4. Verify SMTP configuration in bot logs
5. Contact administrator if issues persist

### Email Delivery Issues
- Check SMTP credentials and settings
- Verify email provider allows app passwords
- Check bot console logs for specific errors
- Test email configuration with simple test

### Discord DM Issues
- Customer may have DMs disabled from server members
- Customer may have blocked the bot
- Customer may have left the server
- Check bot permissions and status

## Future Enhancements

### Planned Features
- Automatic receipt sending option
- QR codes on receipts for order verification
- PDF receipt generation
- Receipt templates/customization
- Bulk receipt sending for multiple orders
- Receipt status tracking and delivery confirmation
