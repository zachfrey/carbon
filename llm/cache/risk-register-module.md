# Risk Register Module (Quality Management)

## Overview

The Risk Register module is part of the quality management system in Carbon ERP. It allows tracking and managing risks associated with various entities throughout the system including items, work centers, suppliers, customers, quote lines, and jobs.

## Database Schema

### riskRegister Table

Created in migration `20251210060100_add-risk-registers.sql`

**Schema:**
```sql
CREATE TABLE "riskRegister" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "source" "riskSource" NOT NULL,
  "severity" INTEGER CHECK (severity BETWEEN 1 AND 5),
  "likelihood" INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  "score" INTEGER,
  "sourceId" TEXT,
  "status" "riskStatus" NOT NULL DEFAULT 'OPEN',
  "assignee" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE,

  CONSTRAINT "riskRegister_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "riskRegister_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "riskRegister_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "riskRegister_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE
)
```

### Enums

**riskSource:**
- `GENERAL` - General risks not tied to a specific entity
- `ITEM` - Risks associated with items (parts, materials, tools, consumables)
- `ITEM_MASTER` - Risks associated with item masters
- `QUOTE_LINE` - Risks associated with quote lines
- `JOB` - Risks associated with jobs
- `WORK_CENTER` - Risks associated with work centers
- `SUPPLIER` - Risks associated with suppliers
- `SUPPLIER_MASTER` - Risks associated with supplier masters
- `CUSTOMER` - Risks associated with customers
- `CUSTOMER_MASTER` - Risks associated with customer masters

**riskStatus:**
- `OPEN` - Risk is open and needs attention (default)
- `IN_REVIEW` - Risk is being reviewed
- `MITIGATING` - Actions are being taken to mitigate the risk
- `CLOSED` - Risk has been resolved
- `ACCEPTED` - Risk has been accepted

### Key Fields

- `id` - UUID primary key
- `title` - Risk title (required)
- `description` - Detailed description of the risk
- `source` - Type of entity this risk is associated with (enum)
- `severity` - Risk severity rating (1-5)
- `likelihood` - Likelihood of risk occurring (1-5)
- `score` - Calculated risk score (severity × likelihood)
- `sourceId` - ID of the source entity (generic field that stores the ID regardless of source type)
- `status` - Current status of the risk
- `assignee` - User assigned to manage this risk
- `createdBy` - User who created the risk
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Indexes

- `riskRegister_companyId_idx` - For filtering by company
- `riskRegister_assignee_idx` - For filtering by assignee
- `riskRegister_status_idx` - For filtering by status
- `riskRegister_source_idx` - For filtering by source type

### Row Level Security (RLS)

- **SELECT**: Any employee can view risks in their company
- **INSERT**: Any employee can create risks
- **UPDATE**: Only employees with `quality_update` permission can update risks
- **DELETE**: Only employees with `quality_delete` permission can delete risks

## Routes

### Main Routes
- List: `/x/quality/risks` - View all risks
- New: `/x/quality/risks/new` - Create a new risk
- Edit: `/x/quality/risks/:id` - Edit an existing risk
- Delete: `/x/quality/risks/delete/:id` - Delete a risk

## Components

### RiskRegisterForm

Located at: `apps/erp/app/modules/quality/ui/RiskRegister/RiskRegisterForm.tsx`

Modal/drawer form for creating and editing risks. Includes fields for:
- Title (required)
- Description
- Source (enum, required)
- Status (enum, required)
- Severity (1-5)
- Likelihood (1-5)
- Assignee (employee selector)
- sourceId (hidden field) - ID of the entity this risk is associated with

### RiskRegister

Located at: `apps/erp/app/modules/quality/ui/RiskRegister/RiskRegister.tsx`

Generic component for displaying risks associated with a specific document. Used in various contexts with different source types.

Props:
- `documentId` - ID of the document to show risks for
- `documentType` - Type of document (maps to riskSource enum)

Features:
- Lists all risks for the document
- Add new risk button
- Edit/delete actions on each risk
- Shows severity, likelihood, score, and assignee
- Status badges with color coding

### ItemRiskRegister

Located at: `apps/erp/app/modules/items/ui/Item/ItemRiskRegister.tsx`

Specialized component for displaying risks on item detail pages. Automatically filters risks by itemId and sets source to "ITEM".

Props:
- `itemId` - ID of the item to show risks for

Used in:
- Part details page (`/x/part/:itemId/view/details`)
- Material details page (`/x/material/:itemId/view/details`)
- Tool details page (`/x/tool/:itemId/view/details`)
- Consumable details page (`/x/consumable/:itemId/view/details`)

## Service Functions

Located in: `apps/erp/app/modules/quality/quality.service.ts`

### getRisk
```typescript
getRisk(client: SupabaseClient, riskId: string)
```
Fetches a single risk by ID.

### getRisks
```typescript
getRisks(
  client: SupabaseClient,
  companyId: string,
  args?: {
    search: string | null;
    status?: riskStatus[];
    source?: riskSource[];
    assignee?: string[];
  } & GenericQueryFilters
)
```
Fetches risks with filtering, searching, and pagination support.

### upsertRisk
```typescript
upsertRisk(
  client: SupabaseClient,
  risk: RiskInput
)
```
Creates or updates a risk. Automatically calculates the risk score from severity and likelihood.

### deleteRisk
```typescript
deleteRisk(client: SupabaseClient, riskId: string)
```
Deletes a risk by ID.

### updateRiskStatus
```typescript
updateRiskStatus(
  client: SupabaseClient,
  riskId: string,
  status: riskStatus
)
```
Updates the status of a risk.

## Validators

Located in: `apps/erp/app/modules/quality/quality.models.ts`

### riskRegisterValidator
```typescript
z.object({
  id: zfd.text(z.string().optional()),
  title: z.string().min(1, { message: "Title is required" }),
  description: zfd.text(z.string().optional()),
  source: z.enum(riskSource),
  severity: zfd.numeric(z.number().min(1).max(5).optional()),
  likelihood: zfd.numeric(z.number().min(1).max(5).optional()),
  status: z.enum(riskStatus),
  assignee: zfd.text(z.string().optional()),
  sourceId: zfd.text(z.string().optional()),
})
```

## Integration Points

### Items Module

Risk registers are integrated into all item types (Part, Material, Tool, Consumable) via the `ItemRiskRegister` component. This component is displayed in the details tab of each item type, allowing users to:
- View all risks associated with the item
- Create new risks specific to the item
- Edit existing risks
- Delete risks
- See risk severity, likelihood, and calculated scores
- Assign risks to specific users

The component automatically sets the `source` to "ITEM" and passes the `itemId` as the `sourceId` field in the form.

**Important Implementation Detail:**
- Risks are queried by filtering on both `source` (e.g., "ITEM") AND `sourceId` (the entity's ID)
- The `sourceId` field is a generic TEXT field that stores the ID of any associated entity
- When creating/editing risks, always pass `sourceId` with the entity's ID, not entity-specific fields

### Future Integration Points

The risk register system is designed to be integrated with:
- **Quote Lines** - Track risks in quotes
- **Jobs** - Track manufacturing risks
- **Work Centers** - Track equipment/location risks
- **Suppliers** - Track supplier-related risks
- **Customers** - Track customer-related risks
- **Item Masters** - Track risks at the master item level
- **Supplier Masters** - Track risks at the supplier master level
- **Customer Masters** - Track risks at the customer master level

Each integration follows the same pattern as the Items integration, using the generic `RiskRegister` component with the appropriate `documentType` and `documentId` props.

## Path Utilities

Located in: `apps/erp/app/utils/path.ts`

```typescript
risks: `${x}/quality/risks`
risk: (id: string) => generatePath(`${x}/quality/risks/${id}`)
newRisk: `${x}/quality/risks/new`
deleteRisk: (id: string) => generatePath(`${x}/quality/risks/delete/${id}`)
```

## Permissions

- **View**: Requires `view: "quality"` and `role: "employee"`
- **Create**: Requires `create: "quality"` and `role: "employee"`
- **Update**: Requires `update: "quality"` and `role: "employee"`
- **Delete**: Requires `delete: "quality"` and `role: "employee"`

## UI/UX Features

- Risk score is automatically calculated from severity × likelihood
- Status badges use color coding:
  - `OPEN` - Destructive (red)
  - `CLOSED` - Default (gray)
  - Other statuses - Secondary (blue/gray)
- Risks are sorted by creation date (newest first)
- Employee avatars show assignees
- Hover effects on risk cards reveal edit/delete actions
- Empty state message when no risks exist
- Loading state while fetching risks
- Toast notifications for success/error states
