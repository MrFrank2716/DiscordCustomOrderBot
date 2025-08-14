# 🎫 Promotional Token System Guide

## Overview
The Discord Order Bot includes a comprehensive promotional token system designed for marketing campaigns, special offers, and customer incentives. This guide covers everything from token creation to campaign management.

## 🎯 System Purpose

### What Promotional Tokens Do
- **Marketing Campaigns**: Create unique codes for special promotions
- **Customer Incentives**: Reward loyal customers with special offers
- **Event Promotions**: Distribute tokens at trade shows, events, or online campaigns
- **Usage Tracking**: Monitor campaign effectiveness and customer engagement
- **Audit Trail**: Complete history of token creation, distribution, and usage

### How Tokens Work
1. **Admin creates tokens** with descriptions and optional notes
2. **Physical distribution** - codes are written on promotional materials
3. **Customer redemption** - customers provide codes when placing orders
4. **Automatic validation** - bot checks token validity during order creation
5. **Usage tracking** - tokens are marked as used when orders complete
6. **Campaign analysis** - admins can review token usage statistics

## 🔧 Token Management Commands

### `/generatetoken` - Create New Tokens
Generate unique promotional tokens for campaigns.

**Command Format:**
```
/generatetoken description:"Campaign Name/Offer Description" notes:"Additional details or conditions"
```

**Parameters:**
- `description` (required): Clear, descriptive name for the token
- `notes` (optional): Additional information, conditions, or internal notes

**Examples:**
```
/generatetoken description:"Black Friday 2025 - 25% Off" notes:"Valid Nov 24-30, 2025"
/generatetoken description:"Trade Show Giveaway" notes:"Comic-Con 2025, Booth #123"
/generatetoken description:"Loyal Customer Appreciation" notes:"For customers with 5+ orders"
/generatetoken description:"Social Media Contest Winner"
```

**Generated Token Features:**
- **Unique 5-character alphanumeric code** (e.g., A1B2C, X9Y8Z, K7L3M)
- **Creation tracking** with timestamp and administrator
- **Distribution instructions** for physical materials
- **Initial status** set to "Available"

### `/checktoken` - Validate and Inspect Tokens
Check token status, validity, and detailed information.

**Command Format:**
```
/checktoken token_code:CODE
```

**Information Displayed:**
- **Current Status**: Available (✅) or Used (❌)
- **Creation Details**: When created and by whom
- **Description**: Campaign or offer details
- **Notes**: Additional information or conditions
- **Usage History**: If used, shows customer, order, and completion date

**Use Cases:**
- **Customer Service**: Verify customer token before order creation
- **Campaign Monitoring**: Check token usage during active campaigns
- **Troubleshooting**: Investigate customer complaints or issues
- **Audit Review**: Verify token details for reporting

### `/removetoken` - Delete Tokens
Permanently remove tokens from the system.

**Command Format:**
```
/removetoken token_code:CODE reason:"Explanation for removal"
```

**Parameters:**
- `token_code` (required): The token code to remove
- `reason` (required): Clear explanation for why token is being removed

**Common Removal Reasons:**
- "Campaign ended, tokens expired"
- "Token compromised or duplicated"
- "Customer service resolution"
- "Administrative cleanup"
- "Campaign cancelled"

**Safety Features:**
- **Confirmation required**: Shows token details before deletion
- **Permanent action**: Cannot be undone once completed
- **Audit logging**: Records who removed token and why
- **Impact notification**: Shows whether token was used or available

### `/listtokens` - View and Filter Tokens
Display all tokens with filtering and summary statistics.

**Command Format:**
```
/listtokens [status:filter]
```

**Status Filters:**
- `all` (default): Show all tokens regardless of status
- `available`: Show only unused tokens
- `used`: Show only tokens that have been redeemed

**Display Features:**
- **Pagination**: Up to 10 tokens per view
- **Status Indicators**: Visual confirmation of availability
- **Summary Statistics**: Total, available, and used counts
- **Campaign Tracking**: Creation dates and descriptions
- **Usage Information**: Order codes and customer details for used tokens

**Information Per Token:**
- Token code with status emoji
- Description (truncated to 60 characters for readability)
- Creation date
- Usage details (if applicable)

## 🛒 Token Integration with Orders

### Customer Token Redemption
When customers have promotional tokens:

1. **Customer provides token code** to staff member
2. **Staff uses enhanced `/createorder` command** with token parameter:
   ```
   /createorder description:"Order details" customer:@customer token_code:A1B2C
   ```
3. **Automatic validation** occurs:
   - Bot checks if token exists
   - Verifies token is unused
   - Shows clear error if invalid
4. **Order creation succeeds** with token association
5. **Visual confirmation** shows token was applied

### Order Completion and Token Usage
When orders with tokens are completed:

1. **Automatic token marking**: Token status changes from "Available" to "Used"
2. **Usage tracking**: Records customer ID, order code, and completion timestamp
3. **Audit trail**: Complete history for campaign analysis
4. **Visual confirmation**: Completion message shows token was processed

### Error Handling
- **Token not found**: Clear message if code doesn't exist
- **Token already used**: Shows when and by whom token was previously used
- **Invalid format**: Guidance on correct token code format
- **System errors**: Graceful handling with user-friendly messages

## 📊 Campaign Management

### Planning a Token Campaign

#### Pre-Launch Setup
1. **Define campaign goals**: What are you trying to achieve?
2. **Create descriptive tokens**: Use clear, memorable descriptions
3. **Add detailed notes**: Include validity periods, conditions, restrictions
4. **Generate sufficient quantity**: Create enough tokens for expected distribution
5. **Document distribution plan**: Track who gets tokens and when

#### During Campaign
1. **Monitor usage**: Regular checks with `/listtokens status:used`
2. **Customer service**: Use `/checktoken` to help customers with issues
3. **Track effectiveness**: Monitor redemption rates and customer engagement
4. **Address issues**: Quick resolution of token problems

#### Post-Campaign
1. **Final analysis**: Review total usage and campaign success
2. **Cleanup unused tokens**: Remove expired tokens with clear reasons
3. **Document lessons learned**: What worked well and what to improve
4. **Archive campaign data**: Keep records for future reference

### Campaign Examples

#### Seasonal Promotion
```
Campaign: "Summer Sale 2025"
Tokens: 100 generated
Description: "Summer Sale - 20% Off All Orders"
Notes: "Valid June 1-30, 2025. Cannot combine with other offers."
Distribution: Social media, email newsletter, physical flyers
```

#### Event Marketing
```
Campaign: "Convention Booth Giveaway"
Tokens: 50 generated
Description: "Comic-Con 2025 Exclusive Offer"
Notes: "Booth #456, July 20-23. One per customer."
Distribution: Business cards handed out at booth
```

#### Customer Loyalty
```
Campaign: "VIP Customer Appreciation"
Tokens: 25 generated
Description: "Loyal Customer Thank You - Special Discount"
Notes: "For customers with 10+ completed orders"
Distribution: Direct message to qualifying customers
```

## 🔒 Security and Best Practices

### Security Features
- **Admin-only access**: All token management requires administrator permissions
- **Unique code generation**: Cryptographically secure randomization prevents duplicates
- **Usage prevention**: Used tokens cannot be redeemed again
- **Complete audit trail**: Full logging of all token operations
- **Permission validation**: Commands verify user authorization before execution

### Best Practices for Administrators

#### Token Creation
- **Use descriptive names**: Make it easy to identify campaigns later
- **Include expiration dates**: Add validity periods in notes field
- **Document conditions**: Clearly state any restrictions or limitations
- **Plan distribution method**: Know how tokens will reach customers

#### Distribution Security
- **Physical token security**: Store blank promotional materials securely
- **Limited access**: Only trusted staff should handle token codes
- **Track distribution**: Document who received tokens and when
- **Monitor for fraud**: Watch for suspicious usage patterns

#### Campaign Monitoring
- **Regular usage checks**: Monitor redemption rates throughout campaign
- **Customer service readiness**: Train staff on token validation procedures
- **Issue resolution**: Have clear procedures for handling token problems
- **Data backup**: Ensure token data is included in regular backups

#### Campaign Cleanup
- **Timely removal**: Remove expired tokens promptly after campaigns end
- **Clear removal reasons**: Document why tokens are being removed
- **Usage analysis**: Review campaign effectiveness before cleanup
- **Archive information**: Save campaign summaries for future reference

### Common Security Considerations

#### Fraud Prevention
- **One-time use**: Tokens automatically become invalid after use
- **No replication**: Used tokens cannot be duplicated or reused
- **Usage tracking**: Complete audit trail for investigation
- **Admin oversight**: All token operations require administrative approval

#### Data Protection
- **Secure storage**: Token data is stored in encrypted JSON files
- **Access control**: Only authorized administrators can manage tokens
- **Audit logging**: All operations are logged for security review
- **Backup inclusion**: Token data is included in automated backups

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### Token Generation Problems
**Issue**: Token generation fails or returns error
- **Check permissions**: Verify admin role is configured correctly
- **Storage space**: Ensure sufficient disk space for data files
- **File permissions**: Verify bot can write to data directory
- **System restart**: Restart bot if persistent issues occur

#### Token Validation Issues
**Issue**: Valid tokens show as invalid during order creation
- **Case sensitivity**: Ensure token code is entered exactly as generated
- **Timing issues**: Allow time for data synchronization after token creation
- **Data corruption**: Check data files for corruption or restore from backup
- **Command syntax**: Verify correct usage of `/createorder` with token parameter

#### Customer Service Issues
**Issue**: Customer claims token isn't working
- **Verify token exists**: Use `/checktoken` to confirm token is in system
- **Check usage status**: Confirm token hasn't already been used
- **Validate code accuracy**: Ensure customer is providing correct code
- **Review campaign validity**: Check if campaign is still active

#### System Performance Issues
**Issue**: Token commands are slow or unresponsive
- **Data file size**: Large token files may impact performance
- **Memory usage**: Monitor bot memory usage during peak periods
- **Network connectivity**: Verify stable connection to Discord servers
- **Regular maintenance**: Perform periodic cleanup of expired tokens

### Error Messages and Meanings

#### Token Generation Errors
- "Permission denied": User lacks administrative privileges
- "System error": File system or data storage issue
- "Invalid parameters": Missing or incorrect command parameters

#### Token Validation Errors
- "Token not found": Code doesn't exist in system
- "Token already used": Code was previously redeemed
- "Invalid format": Code doesn't match expected pattern
- "System unavailable": Temporary service disruption

#### Token Management Errors
- "Cannot remove token": Token may be in use or system locked
- "Access denied": Insufficient permissions for operation
- "Data corruption": Token data file may be damaged

## 📈 Analytics and Reporting

### Campaign Effectiveness Metrics
Use the token system to measure campaign success:

#### Redemption Rate
- **Formula**: (Used Tokens / Total Tokens) × 100
- **Good rate**: 20-40% for most campaigns
- **Tracking**: Monitor throughout campaign duration

#### Customer Engagement
- **New vs returning customers**: Track who redeems tokens
- **Order value impact**: Compare token vs non-token orders
- **Completion rates**: Monitor if token orders complete successfully

#### Campaign ROI
- **Distribution cost**: Cost of creating and distributing physical tokens
- **Redemption value**: Value of discounts or offers provided
- **Customer acquisition**: New customers gained through campaign

### Data Export and Analysis
While the bot doesn't include built-in reporting, you can:
- **Regular token lists**: Use `/listtokens` to capture usage snapshots
- **Manual tracking**: Export data from JSON files for analysis
- **Campaign summaries**: Document results after each campaign
- **Trend analysis**: Compare campaigns over time for improvement

## 🚀 Advanced Implementation

### Integration with Other Systems
The token system can complement other bot features:

#### Order Dependencies
- Create special tokens for priority processing
- Link token redemption to expedited handling
- Use tokens for complex multi-part orders

#### Customer Reviews
- Generate tokens as rewards for positive reviews
- Create thank-you tokens for detailed feedback
- Implement loyalty programs based on review participation

#### Receipt System
- Include token information in customer receipts
- Track token savings in receipt details
- Use receipts to promote future token campaigns

### Customization Opportunities
For advanced users who want to modify the system:

#### Token Code Format
- Current: 5-character alphanumeric (A1B2C)
- Possible modifications: Length, character sets, patterns
- Consideration: Balance between security and usability

#### Campaign Features
- Expiration date enforcement
- Usage limits per customer
- Token categories or types
- Batch token generation

#### Integration Features
- Email notification for token usage
- Webhook integration for external systems
- API endpoints for campaign management
- Automated campaign analysis

## 📞 Support and Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Review active campaigns and usage rates
2. **Monthly**: Clean up expired or unused tokens
3. **Quarterly**: Analyze campaign effectiveness and trends
4. **Annually**: Review and update token system procedures

### Backup Considerations
- **Data files**: Ensure `tokens.json` is included in backups
- **Campaign documentation**: Keep records of all campaigns
- **Usage statistics**: Archive campaign performance data
- **Recovery procedures**: Test token data recovery processes

### System Updates
When updating the bot:
- **Data compatibility**: Verify token data format compatibility
- **Feature enhancements**: Review new token-related features
- **Migration procedures**: Follow upgrade instructions carefully
- **Testing**: Validate token functionality after updates

---

**For additional support or questions about the promotional token system, contact your system administrator or refer to the main bot documentation.**
