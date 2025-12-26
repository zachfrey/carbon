# Xero API Contact Structure Documentation

## Contact Response Structure

Based on analysis of the Carbon codebase's XeroProvider implementation and web research, here are the key field names used by Xero API for contact responses:

### Phone Fields
Xero uses a `Phones` array structure for phone numbers:

```typescript
// Xero API Response Structure
{
  "Phones": [
    {
      "PhoneType": "DEFAULT" | "MOBILE" | "WORK" | "HOME" | "FAX",
      "PhoneNumber": "555-1234"
    }
  ]
}
```

**Implementation Notes:**
- The Carbon XeroProvider accesses phone numbers via `xeroContact.Phones?.[0]?.PhoneNumber`
- When creating contacts, phones are structured as: `[{ PhoneType: "DEFAULT", PhoneNumber: customer.phone }]`
- Multiple phone numbers can be stored in the array with different types

### Website Field
**Important Limitation:** The Xero API **does not support** website fields in the standard contact object.

From research findings:
- Website field is not available for setting via the Xero API
- There are community requests to include Website URL in the API feed
- Developers have requested that all contact fields should be updatable via API
- Currently, website information must be managed through the Xero web interface

### Email Field
```typescript
{
  "EmailAddress": "contact@example.com"
}
```

### Other Key Contact Fields Used by Carbon

```typescript
{
  "ContactID": "uuid-string",
  "Name": "Contact Name",
  "FirstName": "First",
  "LastName": "Last",
  "EmailAddress": "email@example.com",
  "Phones": [
    {
      "PhoneType": "DEFAULT",
      "PhoneNumber": "555-1234"
    }
  ],
  "Addresses": [
    {
      "AddressType": "STREET",
      "AddressLine1": "123 Main St",
      "City": "City",
      "Region": "State",
      "PostalCode": "12345",
      "Country": "Country"
    }
  ],
  "TaxNumber": "123456789",
  "DefaultCurrency": "USD",
  "ContactStatus": "ACTIVE",
  "IsCustomer": true,
  "IsSupplier": false,
  "CreatedDateUTC": "2024-01-01T00:00:00.000Z",
  "UpdatedDateUTC": "2024-01-01T00:00:00.000Z"
}
```

### Contact Type Classification
Xero uses boolean flags to determine contact types:
- `IsCustomer`: Boolean flag indicating if contact is a customer
- `IsSupplier`: Boolean flag indicating if contact is a supplier
- A contact can be both customer and supplier (both flags true)

### Address Structure
```typescript
{
  "Addresses": [
    {
      "AddressType": "STREET" | "POBOX",
      "AddressLine1": "Street address",
      "AddressLine2": "Additional address info",
      "AddressLine3": "More address info",
      "AddressLine4": "Even more address info",
      "City": "City name",
      "Region": "State/Province",
      "PostalCode": "Postal code",
      "Country": "Country name"
    }
  ]
}
```

## Implementation in Carbon

The Carbon XeroProvider transforms Xero contacts as follows:

```typescript
// For customers and vendors
{
  id: xeroContact.ContactID,
  name: xeroContact.Name,
  email: xeroContact.EmailAddress,
  phone: xeroContact.Phones?.[0]?.PhoneNumber, // Takes first phone number
  addresses: xeroContact.Addresses?.[0] ? [/* transformed address */] : undefined,
  taxNumber: xeroContact.TaxNumber,
  currency: xeroContact.DefaultCurrency || "USD",
  isActive: xeroContact.ContactStatus === "ACTIVE",
  // Note: No website field due to Xero API limitation
}
```

## API Limitations

1. **Website Field**: Not supported by Xero API
2. **Phone Numbers**: Only first phone number is used by Carbon implementation
3. **Address**: Only first address is used by Carbon implementation
4. **Contact Bank Details**: BSB and Account number can only be updated via API, other bank details require UI

## Recommendations

1. **For Website Data**: Consider storing in Carbon's internal customer/supplier tables since Xero doesn't support it
2. **For Multiple Phones**: Carbon could be enhanced to support multiple phone numbers from the Phones array
3. **For Complete Address Data**: Carbon could store multiple addresses if needed

## Related Files

- `/Users/barbinbrad/Code/carbon/packages/ee/src/accounting/providers/xero.ts` - XeroProvider implementation
- `/Users/barbinbrad/Code/carbon/apps/erp/app/routes/api+/webhook.xero.ts` - Webhook handling with contact processing