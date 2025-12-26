import { z } from "zod";

export namespace Xero {
  export const AddressSchema = z.object({
    AddressType: z.enum(["POBOX", "STREET", "DELIVERY"]),
    AddressLine1: z.string().optional(),
    AddressLine2: z.string().optional(),
    AddressLine3: z.string().optional(),
    AddressLine4: z.string().optional(),
    City: z.string().optional(),
    Region: z.string().optional(),
    PostalCode: z.string().optional(),
    Country: z.string().optional(),
    AttentionTo: z.string().optional()
  });

  export const PhoneSchema = z.object({
    PhoneType: z.enum(["DDI", "DEFAULT", "FAX", "MOBILE"]),
    PhoneNumber: z.string().optional(),
    PhoneAreaCode: z.string().optional(),
    PhoneCountryCode: z.string().optional()
  });

  export const BalancesSchema = z.object({
    AccountsReceivable: z.object({
      Outstanding: z.number(),
      Overdue: z.number()
    }),
    AccountsPayable: z.object({
      Outstanding: z.number(),
      Overdue: z.number()
    })
  });

  export const BrandingThemeSchema = z.object({
    BrandingThemeID: z.string().uuid(),
    Name: z.string()
  });

  export const BatchPaymentsSchema = z.object({
    BankAccountNumber: z.string(),
    BankAccountName: z.string(),
    Details: z.string(),
    Code: z.string().optional(),
    Reference: z.string().optional()
  });

  export const ContactSchema = z.object({
    ContactID: z.string().uuid(),
    ContactStatus: z.literal("ACTIVE"),

    Name: z.string(),
    Website: z.string().optional(),

    FirstName: z.string().optional(),
    LastName: z.string().optional(),

    EmailAddress: z.string().email().optional(),
    ContactNumber: z.string().optional(),

    BankAccountDetails: z.string().optional(),
    TaxNumber: z.string().optional(),

    AccountsReceivableTaxType: z.string().optional(),
    AccountsPayableTaxType: z.string().optional(),

    Addresses: z.array(AddressSchema),
    Phones: z.array(PhoneSchema),

    UpdatedDateUTC: z.string(), // serialized /Date(...)/

    ContactGroups: z.array(z.unknown()),

    IsSupplier: z.boolean(),
    IsCustomer: z.boolean(),

    DefaultCurrency: z.string().optional(),

    BrandingTheme: BrandingThemeSchema.optional(),
    BatchPayments: BatchPaymentsSchema.optional(),

    Balances: BalancesSchema.optional(),

    ContactPersons: z.array(z.unknown()),

    HasAttachments: z.boolean(),
    HasValidationErrors: z.boolean()
  });

  export type Contact = z.infer<typeof ContactSchema>;
}

export namespace QuickBooks {
  export const BillAddrSchema = z.object({
    City: z.string(),
    Line1: z.string(),
    PostalCode: z.string(),
    Lat: z.string(),
    Long: z.string(),
    CountrySubDivisionCode: z.string(),
    Id: z.string()
  });

  export const MetaDataSchema = z.object({
    CreateTime: z.coerce.date(),
    LastUpdatedTime: z.coerce.date()
  });

  export const PrimaryEmailAddrSchema = z.object({
    Address: z.string()
  });

  export const PrimaryPhoneSchema = z.object({
    FreeFormNumber: z.string()
  });

  export const CustomerSchema = z.object({
    PrimaryEmailAddr: PrimaryEmailAddrSchema,
    SyncToken: z.string(),
    domain: z.string(),
    GivenName: z.string(),
    DisplayName: z.string(),
    BillWithParent: z.boolean(),
    FullyQualifiedName: z.string(),
    CompanyName: z.string(),
    FamilyName: z.string(),
    sparse: z.boolean(),
    PrimaryPhone: PrimaryPhoneSchema,
    Active: z.boolean(),
    Job: z.boolean(),
    BalanceWithJobs: z.number(),
    BillAddr: BillAddrSchema,
    PreferredDeliveryMethod: z.string(),
    Taxable: z.boolean(),
    PrintOnCheckName: z.string(),
    Balance: z.number(),
    Id: z.string(),
    MetaData: MetaDataSchema
  });

  export type Customer = z.infer<typeof CustomerSchema>;
}
