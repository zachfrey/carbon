# Xero Webhooks Information

## Signature Verification

Xero webhooks use HMAC SHA-256 for signature verification, following industry standards for webhook security.

### Key Details:

- **Algorithm**: HMAC-SHA256
- **Header**: `x-xero-signature` (based on common Xero webhook implementations)
- **Signature Format**: Base64-encoded HMAC SHA-256 hash
- **Timeout**: Endpoints must respond within 5 seconds with HTTP 200 OK
- **Validation Requirements**:
  - HTTP 200 for valid signatures
  - HTTP 401 for invalid signatures
  - Raw payload must be used for signature calculation (not parsed JSON)

### Signature Verification Process:

1. Extract the signature from the `x-xero-signature` header
2. Compute HMAC SHA-256 hash of the raw request body using the webhook secret
3. Base64 encode the computed hash
4. Compare with the received signature using timing-safe comparison

## Supported Entity Types and Events

Based on current Xero API capabilities, webhooks support the following:

### Core Entity Types:

1. **Contacts** (Customers/Suppliers)
   - CREATE events
   - UPDATE events

2. **Invoices**
   - CREATE events
   - UPDATE events

3. **Event Structure**:
   - `EventCategory`: The type of entity (e.g., "CONTACT", "INVOICE")
   - `EventType`: The operation type (e.g., "CREATE", "UPDATE")

### Webhook Payload Structure:

Xero webhooks typically follow this structure:

```json
{
  "events": [
    {
      "resourceId": "entity-uuid",
      "resourceUrl": "https://api.xero.com/api.xro/2.0/EntityType/entity-uuid",
      "eventCategory": "CONTACT",
      "eventType": "UPDATE",
      "eventDateUtc": "2025-01-01T00:00:00.000Z",
      "tenantId": "tenant-uuid",
      "tenantType": "ORGANISATION"
    }
  ],
  "lastEventSequence": 1,
  "firstEventSequence": 1,
  "entropy": "random-string"
}
```

## Implementation Considerations

### Rate Limits:
- 5 concurrent calls
- 60 calls per minute
- 5,000 calls per day

### Security Requirements:
- Must validate signature using HMAC SHA-256
- Must respond within 5 seconds
- Raw request body required for signature validation
- Frameworks that auto-parse JSON can break validation

### Integration Points:

Based on existing Carbon patterns:

1. **Webhook Endpoint**: `/api/webhook/xero`
2. **Authentication**: Uses Xero webhook secret stored in environment
3. **Processing**: Triggers async accounting sync jobs
4. **Entity Mapping**:
   - Xero Contacts → Carbon Customers/Suppliers
   - Xero Invoices → Carbon Invoices

### Current Implementation Status in Carbon:

- Xero provider class exists but webhook methods are stubbed
- Need to implement `verifyWebhook()` and `processWebhook()` methods
- Follow QuickBooks webhook pattern for async job triggering
- Use existing accounting sync infrastructure

## Environment Variables Required:

```
XERO_WEBHOOK_SECRET=your-webhook-secret-key
```

This secret is used for HMAC SHA-256 signature verification and should be stored securely.

## Next Steps for Implementation:

1. Implement `verifyWebhook()` method in XeroProvider
2. Implement `processWebhook()` method to parse event payload
3. Create webhook endpoint route similar to QuickBooks
4. Map Xero entity types to Carbon entity types
5. Test webhook signature verification
6. Configure webhook URL in Xero developer console