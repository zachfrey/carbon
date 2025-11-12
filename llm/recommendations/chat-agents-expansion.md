# Carbon ERP Chat Agents - Expansion Recommendations

## Executive Summary

This document outlines recommendations for expanding the Carbon ERP chat interface with **10 new specialized agents** (beyond the existing purchasing and search agents), each with **10-20 tools** to enable users to perform core ERP operations through natural language conversation.

### Design Principles
- **Minimal Dependencies**: Each tool imports only the specific service functions it needs
- **Vector Search**: Leverage embeddings for fuzzy search where applicable
- **Multi-Step Workflows**: Support complex operations with confirmation steps
- **Parallel Execution**: Enable multiple tool calls when operations are independent
- **Context-Aware**: All tools receive ChatContext for company/user scoping

### Current State
- ✅ **Orchestration Agent** - Routes requests to specialists
- ✅ **Purchasing Agent** - Purchase orders, supplier selection (4 tools)
- ✅ **Search Agent** - General web search (1 tool)

---

## Agent 1: Sales Agent

### Purpose
Manages customer relationships, quotes, sales orders, opportunities, and RFQs. Enables sales team to create quotes, convert to orders, and track customer interactions through chat.

### Handoff Triggers
- Customer inquiries, quotes, sales orders
- "Create a quote for...", "Find customer...", "Convert quote to order..."
- Customer management, pricing, order status

### Tools (15)

#### 1. `getCustomer`
**Purpose**: Search for customers by name, account number, or description
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().describe("Customer name, account number, or description to search for")
})
```
**Service Dependencies**:
```typescript
import { getCustomers } from "~/modules/sales/sales.service";
```
**Vector Search**: Use `customers_search` stored procedure with embeddings for fuzzy matching
**Returns**: Customer details including ID, name, account number, status, payment terms, contacts

#### 2. `getCustomerContacts`
**Purpose**: Get all contacts for a specific customer
**Input Schema**:
```typescript
z.object({
  customerId: z.string().describe("Customer ID")
})
```
**Service Dependencies**:
```typescript
import { getCustomerContacts } from "~/modules/sales/sales.service";
```
**Returns**: List of contacts with name, email, phone, role

#### 3. `getCustomerLocations`
**Purpose**: Get shipping/billing addresses for a customer
**Input Schema**:
```typescript
z.object({
  customerId: z.string().describe("Customer ID")
})
```
**Service Dependencies**:
```typescript
import { getCustomerLocations } from "~/modules/sales/sales.service";
```
**Returns**: Locations with address, type (billing/shipping), default flags

#### 4. `getQuote`
**Purpose**: Retrieve specific quote details
**Input Schema**:
```typescript
z.object({
  quoteId: z.string().describe("Quote ID")
})
```
**Service Dependencies**:
```typescript
import { getQuote, getQuoteLines } from "~/modules/sales/sales.service";
```
**Returns**: Quote header, lines, totals, status, expiration date

#### 5. `searchQuotes`
**Purpose**: Find quotes by customer, status, date range
**Input Schema**:
```typescript
z.object({
  customerId: z.string().optional().describe("Filter by customer"),
  status: z.enum(["Draft", "Submitted", "Approved", "Rejected", "Expired"]).optional(),
  fromDate: z.string().optional().describe("ISO date string"),
  toDate: z.string().optional().describe("ISO date string")
})
```
**Service Dependencies**:
```typescript
import { getQuotes } from "~/modules/sales/sales.service";
```
**Returns**: List of quotes matching criteria

#### 6. `createQuote`
**Purpose**: Create a new sales quote with line items
**Input Schema**:
```typescript
z.object({
  customerId: z.string(),
  customerContactId: z.string().optional(),
  customerLocationId: z.string().optional(),
  expirationDate: z.string().describe("ISO date string"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    leadTime: z.number().optional().describe("Days")
  }))
})
```
**Service Dependencies**:
```typescript
import { getNextSequence } from "~/modules/settings/settings.service";
import { getQuote } from "~/modules/sales/sales.service";
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Multi-step with confirmation before inserting
**Returns**: Created quote with readable ID

#### 7. `convertQuoteToOrder`
**Purpose**: Convert an approved quote to a sales order
**Input Schema**:
```typescript
z.object({
  quoteId: z.string(),
  orderDate: z.string().optional().describe("ISO date, defaults to today"),
  requestedDeliveryDate: z.string().optional().describe("ISO date")
})
```
**Service Dependencies**:
```typescript
import { convertQuoteToOrder } from "~/modules/sales/sales.service";
```
**Returns**: Created sales order details

#### 8. `getSalesOrder`
**Purpose**: Retrieve sales order details
**Input Schema**:
```typescript
z.object({
  salesOrderId: z.string().describe("Sales order ID")
})
```
**Service Dependencies**:
```typescript
import { getSalesOrder, getSalesOrderLines } from "~/modules/sales/sales.service";
```
**Returns**: Order header, lines, shipment status, invoicing status

#### 9. `searchSalesOrders`
**Purpose**: Find sales orders by customer, status, date range
**Input Schema**:
```typescript
z.object({
  customerId: z.string().optional(),
  status: z.enum(["Draft", "Confirmed", "In Production", "Shipped", "Closed"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getSalesOrders } from "~/modules/sales/sales.service";
```
**Returns**: List of sales orders matching criteria

#### 10. `closeSalesOrder`
**Purpose**: Close a completed sales order
**Input Schema**:
```typescript
z.object({
  salesOrderId: z.string()
})
```
**Service Dependencies**:
```typescript
import { closeSalesOrder } from "~/modules/sales/sales.service";
```
**Returns**: Updated order status

#### 11. `getOpportunity`
**Purpose**: Retrieve sales opportunity details
**Input Schema**:
```typescript
z.object({
  opportunityId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getOpportunity } from "~/modules/sales/sales.service";
```
**Returns**: Opportunity details, probability, expected close date, value

#### 12. `searchOpportunities`
**Purpose**: Find opportunities by customer, stage, date range
**Input Schema**:
```typescript
z.object({
  customerId: z.string().optional(),
  stage: z.enum(["Prospecting", "Qualification", "Proposal", "Negotiation", "Won", "Lost"]).optional(),
  assignedTo: z.string().optional().describe("User ID")
})
```
**Service Dependencies**:
```typescript
import { getOpportunities } from "~/modules/sales/sales.service";
```
**Returns**: List of opportunities

#### 13. `getSalesRFQ`
**Purpose**: Get customer RFQ (Request for Quote) details
**Input Schema**:
```typescript
z.object({
  rfqId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSalesRFQ, getSalesRFQLines } from "~/modules/sales/sales.service";
```
**Returns**: RFQ details with requested items and quantities

#### 14. `convertSalesRfqToQuote`
**Purpose**: Convert customer RFQ to a quote
**Input Schema**:
```typescript
z.object({
  rfqId: z.string(),
  expirationDate: z.string().describe("ISO date string")
})
```
**Service Dependencies**:
```typescript
import { convertSalesRfqToQuote } from "~/modules/sales/sales.service";
```
**Returns**: Created quote details

#### 15. `getCustomerPriceHistory`
**Purpose**: Get pricing history for an item-customer combination
**Input Schema**:
```typescript
z.object({
  customerId: z.string(),
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getItemUnitSalePrice } from "~/modules/items/items.service";
```
**Returns**: Historical pricing data, volume discounts

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.3
- **Max Turns**: 15
- **Handoffs**: items-agent (for part details), invoicing-agent (for billing)

---

## Agent 2: Inventory Agent

### Purpose
Manages inventory tracking, stock transfers, receipts, shipments, warehouse operations, and location management. Provides real-time inventory visibility and transaction processing.

### Handoff Triggers
- Stock inquiries, transfers, receipts, shipments
- "How much inventory...", "Transfer stock...", "Create receipt..."
- Warehouse operations, location management

### Tools (18)

#### 1. `getInventoryQuantities`
**Purpose**: Get current inventory quantities for an item across all locations
**Input Schema**:
```typescript
z.object({
  itemId: z.string().describe("Item ID"),
  locationId: z.string().optional().describe("Specific location to check")
})
```
**Service Dependencies**:
```typescript
import { getItemQuantities, getItemShelfQuantities } from "~/modules/items/items.service";
```
**Returns**: On-hand, available, allocated quantities by location and shelf

#### 2. `searchInventoryItems`
**Purpose**: Search for items with inventory using description or part number
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().describe("Item description or readable ID")
})
```
**Service Dependencies**:
```typescript
import { getInventoryItems } from "~/modules/inventory/inventory.service";
```
**Vector Search**: Use `items_search` stored procedure
**Returns**: Items with current inventory levels

#### 3. `getItemLedger`
**Purpose**: Get transaction history for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  locationId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getItemLedgerPage } from "~/modules/inventory/inventory.service";
```
**Returns**: Transaction history with dates, quantities, transaction types, references

#### 4. `createStockTransfer`
**Purpose**: Transfer stock between shelves/locations
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  fromShelfId: z.string(),
  toShelfId: z.string(),
  quantity: z.number(),
  notes: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getNextSequence } from "~/modules/settings/settings.service";
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Validates from/to locations, checks available quantity
**Returns**: Transfer confirmation with tracking number

#### 5. `getStockTransfer`
**Purpose**: Get stock transfer details
**Input Schema**:
```typescript
z.object({
  transferId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getStockTransfer, getStockTransferLines, getStockTransferTracking } from "~/modules/inventory/inventory.service";
```
**Returns**: Transfer details, lines, tracking events

#### 6. `searchStockTransfers`
**Purpose**: Find stock transfers by date, location, status
**Input Schema**:
```typescript
z.object({
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  status: z.enum(["Draft", "In Transit", "Received", "Cancelled"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getStockTransfers } from "~/modules/inventory/inventory.service";
```
**Returns**: List of transfers matching criteria

#### 7. `createReceipt`
**Purpose**: Create a receipt for incoming materials (from PO or other source)
**Input Schema**:
```typescript
z.object({
  sourceDocument: z.enum(["Purchase Order", "Return", "Other"]),
  sourceDocumentId: z.string().optional(),
  receiptDate: z.string().describe("ISO date string"),
  locationId: z.string(),
  lines: z.array(z.object({
    itemId: z.string(),
    shelfId: z.string(),
    quantity: z.number(),
    unitOfMeasureCode: z.string().optional()
  })),
  notes: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getNextSequence } from "~/modules/settings/settings.service";
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Multi-step validation, optional PO matching
**Returns**: Receipt with tracking number

#### 8. `getReceipt`
**Purpose**: Get receipt details
**Input Schema**:
```typescript
z.object({
  receiptId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getReceipt, getReceiptLines, getReceiptTracking } from "~/modules/inventory/inventory.service";
```
**Returns**: Receipt header, lines, tracking, related documents

#### 9. `searchReceipts`
**Purpose**: Find receipts by date, location, PO reference
**Input Schema**:
```typescript
z.object({
  locationId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getReceipts } from "~/modules/inventory/inventory.service";
```
**Returns**: List of receipts

#### 10. `createShipment`
**Purpose**: Create a shipment for outgoing materials (from sales order)
**Input Schema**:
```typescript
z.object({
  salesOrderId: z.string().optional(),
  shipmentDate: z.string().describe("ISO date string"),
  locationId: z.string(),
  shippingMethodId: z.string(),
  trackingNumber: z.string().optional(),
  lines: z.array(z.object({
    salesOrderLineId: z.string().optional(),
    itemId: z.string(),
    shelfId: z.string(),
    quantity: z.number()
  })),
  notes: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getNextSequence } from "~/modules/settings/settings.service";
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Validates inventory availability, updates order status
**Returns**: Shipment with tracking number

#### 11. `getShipment`
**Purpose**: Get shipment details
**Input Schema**:
```typescript
z.object({
  shipmentId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getShipment, getShipmentLines, getShipmentTracking } from "~/modules/inventory/inventory.service";
```
**Returns**: Shipment header, lines, tracking events, related documents

#### 12. `searchShipments`
**Purpose**: Find shipments by date, location, sales order, status
**Input Schema**:
```typescript
z.object({
  locationId: z.string().optional(),
  salesOrderId: z.string().optional(),
  status: z.enum(["Draft", "Picked", "Packed", "Shipped", "Delivered"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getShipments } from "~/modules/inventory/inventory.service";
```
**Returns**: List of shipments

#### 13. `getShelf`
**Purpose**: Get shelf details and current inventory
**Input Schema**:
```typescript
z.object({
  shelfId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getShelf } from "~/modules/inventory/inventory.service";
```
**Returns**: Shelf details, location, capacity, current inventory

#### 14. `searchShelves`
**Purpose**: Find shelves by location or name
**Input Schema**:
```typescript
z.object({
  locationId: z.string().optional(),
  searchTerm: z.string().optional().describe("Shelf identifier/name")
})
```
**Service Dependencies**:
```typescript
import { getShelves, getShelvesListForLocation } from "~/modules/inventory/inventory.service";
```
**Returns**: List of shelves

#### 15. `getKanban`
**Purpose**: Get kanban card details
**Input Schema**:
```typescript
z.object({
  kanbanId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getKanban } from "~/modules/inventory/inventory.service";
```
**Returns**: Kanban details, item, quantity, trigger level, status

#### 16. `searchKanbans`
**Purpose**: Find kanban cards by location, item, status
**Input Schema**:
```typescript
z.object({
  locationId: z.string().optional(),
  itemId: z.string().optional(),
  status: z.enum(["Active", "Triggered", "Released", "Completed"]).optional()
})
```
**Service Dependencies**:
```typescript
import { getKanbans } from "~/modules/inventory/inventory.service";
```
**Returns**: List of kanbans with current status

#### 17. `getTrackedEntity`
**Purpose**: Get serial/batch number details and traceability
**Input Schema**:
```typescript
z.object({
  serialNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getTrackedEntities, getSerialNumbersForItem, getBatchNumbersForItem } from "~/modules/inventory/inventory.service";
```
**Returns**: Traceability information, history, related entities

#### 18. `getShippingMethods`
**Purpose**: Get available shipping methods
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getShippingMethodsList } from "~/modules/inventory/inventory.service";
```
**Returns**: List of shipping methods with carriers, estimated times

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.2 (precision important for inventory)
- **Max Turns**: 12
- **Handoffs**: items-agent (for part details), sales-agent (for order context)

---

## Agent 3: Production Agent

### Purpose
Manages production jobs, operations, scheduling, material consumption, production events, and manufacturing execution. Enables shop floor operations through chat.

### Handoff Triggers
- Job inquiries, production scheduling, operations
- "Create job for...", "Start operation...", "Report production..."
- Production status, work center utilization

### Tools (16)

#### 1. `getJob`
**Purpose**: Get production job details
**Input Schema**:
```typescript
z.object({
  jobId: z.string().describe("Job ID")
})
```
**Service Dependencies**:
```typescript
import { getJob, getJobOperations, getJobMaterials } from "~/modules/production/production.service";
```
**Returns**: Job header, operations list, materials list, status, dates

#### 2. `searchJobs`
**Purpose**: Find jobs by status, part, sales order, date
**Input Schema**:
```typescript
z.object({
  itemId: z.string().optional(),
  salesOrderLineId: z.string().optional(),
  status: z.enum(["Draft", "Released", "In Progress", "Completed", "Closed"]).optional(),
  locationId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getJobs } from "~/modules/production/production.service";
```
**Returns**: List of jobs matching criteria

#### 3. `createJob`
**Purpose**: Create a production job (make-to-order or make-to-stock)
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  quantity: z.number(),
  startDate: z.string().describe("ISO date string"),
  dueDate: z.string().describe("ISO date string"),
  salesOrderLineId: z.string().optional(),
  locationId: z.string(),
  makeMethodId: z.string().optional().describe("Defaults to item's active method"),
  notes: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getNextSequence } from "~/modules/settings/settings.service";
import { getMakeMethodById } from "~/modules/items/items.service";
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Creates job with operations and materials from make method
**Returns**: Created job with readable ID

#### 4. `convertSalesOrderLinesToJobs`
**Purpose**: Create jobs from sales order lines
**Input Schema**:
```typescript
z.object({
  salesOrderLineIds: z.array(z.string())
})
```
**Service Dependencies**:
```typescript
import { convertSalesOrderLinesToJobs } from "~/modules/production/production.service";
```
**Returns**: List of created jobs

#### 5. `getJobOperation`
**Purpose**: Get specific operation details for a job
**Input Schema**:
```typescript
z.object({
  jobOperationId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getJobOperation } from "~/modules/production/production.service";
```
**Returns**: Operation details, work center, setup/run times, status

#### 6. `getActiveJobOperations`
**Purpose**: Get currently active operations at a location or work center
**Input Schema**:
```typescript
z.object({
  locationId: z.string().optional(),
  workCenterId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getActiveJobOperationsByLocation } from "~/modules/production/production.service";
```
**Returns**: List of active operations with job context

#### 7. `getMyJobOperations`
**Purpose**: Get operations assigned to current user
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getJobOperationsAssignedToEmployee } from "~/modules/production/production.service";
```
**Returns**: User's assigned operations

#### 8. `startProductionEvent`
**Purpose**: Start a production operation (clock in)
**Input Schema**:
```typescript
z.object({
  jobOperationId: z.string(),
  workCenterId: z.string(),
  employeeId: z.string().optional().describe("Defaults to current user"),
  quantity: z.number().optional().describe("Batch size if partial")
})
```
**Service Dependencies**:
```typescript
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Creates production event, updates operation status
**Returns**: Production event ID, start time

#### 9. `completeProductionEvent`
**Purpose**: Complete a production operation (clock out)
**Input Schema**:
```typescript
z.object({
  productionEventId: z.string(),
  quantityProduced: z.number(),
  quantityScrap: z.number().optional(),
  scrapReasonId: z.string().optional(),
  notes: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Records output, scrap, updates job progress
**Returns**: Completed event summary

#### 10. `getProductionEvents`
**Purpose**: Get production events (history) for a job or operation
**Input Schema**:
```typescript
z.object({
  jobId: z.string().optional(),
  jobOperationId: z.string().optional(),
  workCenterId: z.string().optional(),
  employeeId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getProductionEvents } from "~/modules/production/production.service";
```
**Returns**: List of production events

#### 11. `getActiveProductionEvents`
**Purpose**: Get currently active production events (operations in progress)
**Input Schema**:
```typescript
z.object({
  workCenterId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getActiveProductionEvents } from "~/modules/production/production.service";
```
**Returns**: Active events with operators and start times

#### 12. `getJobMaterials`
**Purpose**: Get material requirements for a job
**Input Schema**:
```typescript
z.object({
  jobId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getJobMaterialsWithQuantityOnHand } from "~/modules/production/production.service";
```
**Returns**: Materials list with required vs. consumed vs. available quantities

#### 13. `getProcedure`
**Purpose**: Get work instruction/procedure details
**Input Schema**:
```typescript
z.object({
  procedureId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getProcedure, getProcedureSteps } from "~/modules/production/production.service";
```
**Returns**: Procedure with steps, parameters, documents

#### 14. `searchProcedures`
**Purpose**: Find work instructions by name or operation
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().optional(),
  processId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getProcedures } from "~/modules/production/production.service";
```
**Returns**: List of procedures

#### 15. `getDemandForecast`
**Purpose**: Get demand forecast for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getDemandForecasts, getDemandProjections } from "~/modules/production/production.service";
```
**Returns**: Forecast data, projections, historical accuracy

#### 16. `getJobMethodTree`
**Purpose**: Get the complete BOM/routing tree for a job
**Input Schema**:
```typescript
z.object({
  jobId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getJobMethodTree } from "~/modules/production/production.service";
```
**Returns**: Hierarchical tree of operations and materials

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.2
- **Max Turns**: 12
- **Handoffs**: items-agent (for BOMs), inventory-agent (for material availability)

---

## Agent 4: Quality Agent

### Purpose
Manages non-conformances, investigations, corrective actions, gauge calibration, and quality documentation. Enables quality management through chat.

### Handoff Triggers
- Quality issues, non-conformances, gauge calibration
- "Report a defect...", "Create NCR...", "Check gauge calibration..."
- Quality investigations, root cause analysis

### Tools (14)

#### 1. `createIssue`
**Purpose**: Create a non-conformance report or quality issue
**Input Schema**:
```typescript
z.object({
  issueTypeId: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  itemId: z.string().optional(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  detectedAt: z.enum(["Incoming", "In Process", "Final Inspection", "Customer Site"]),
  detectedDate: z.string().describe("ISO date string"),
  assignedTo: z.string().optional().describe("User ID for investigation")
})
```
**Service Dependencies**:
```typescript
import { getNextSequence } from "~/modules/settings/settings.service";
import { supabaseClient } from "~/modules/supabase";
```
**Workflow**: Creates issue with workflow tasks
**Returns**: Issue ID with readable number

#### 2. `getIssue`
**Purpose**: Get non-conformance/issue details
**Input Schema**:
```typescript
z.object({
  issueId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getIssue, getIssueWorkflow, getIssueTasks } from "~/modules/quality/quality.service";
```
**Returns**: Issue details, workflow status, tasks, associations

#### 3. `searchIssues`
**Purpose**: Find issues by status, severity, type, date
**Input Schema**:
```typescript
z.object({
  status: z.enum(["Open", "Investigation", "Action", "Approval", "Closed"]).optional(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  issueTypeId: z.string().optional(),
  assignedTo: z.string().optional(),
  itemId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getIssues } from "~/modules/quality/quality.service";
```
**Returns**: List of issues matching criteria

#### 4. `getMyIssues`
**Purpose**: Get issues assigned to current user
**Input Schema**:
```typescript
z.object({
  status: z.enum(["Open", "Investigation", "Action", "Approval", "Closed"]).optional()
})
```
**Service Dependencies**:
```typescript
import { getIssues } from "~/modules/quality/quality.service";
```
**Returns**: User's assigned issues

#### 5. `addInvestigationTask`
**Purpose**: Add an investigation task to an issue
**Input Schema**:
```typescript
z.object({
  issueId: z.string(),
  investigationTypeId: z.string(),
  assignedTo: z.string(),
  dueDate: z.string().describe("ISO date string"),
  description: z.string()
})
```
**Service Dependencies**:
```typescript
import { supabaseClient } from "~/modules/supabase";
```
**Returns**: Created task ID

#### 6. `addActionTask`
**Purpose**: Add a corrective/preventive action to an issue
**Input Schema**:
```typescript
z.object({
  issueId: z.string(),
  requiredActionId: z.string(),
  assignedTo: z.string(),
  dueDate: z.string().describe("ISO date string"),
  description: z.string()
})
```
**Service Dependencies**:
```typescript
import { supabaseClient } from "~/modules/supabase";
```
**Returns**: Created task ID

#### 7. `addIssueReviewer`
**Purpose**: Add an approver/reviewer to an issue
**Input Schema**:
```typescript
z.object({
  issueId: z.string(),
  userId: z.string(),
  role: z.enum(["Reviewer", "Approver"])
})
```
**Service Dependencies**:
```typescript
import { insertIssueReviewer } from "~/modules/quality/quality.service";
```
**Returns**: Confirmation

#### 8. `getGauge`
**Purpose**: Get gauge/instrument details
**Input Schema**:
```typescript
z.object({
  gaugeId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getGauge } from "~/modules/quality/quality.service";
```
**Returns**: Gauge details, calibration due date, status, location

#### 9. `searchGauges`
**Purpose**: Find gauges by type, location, calibration status
**Input Schema**:
```typescript
z.object({
  gaugeTypeId: z.string().optional(),
  locationId: z.string().optional(),
  calibrationStatus: z.enum(["Current", "Due Soon", "Overdue"]).optional()
})
```
**Service Dependencies**:
```typescript
import { getGauges } from "~/modules/quality/quality.service";
```
**Returns**: List of gauges

#### 10. `getGaugesDueSoon`
**Purpose**: Get gauges needing calibration in next N days
**Input Schema**:
```typescript
z.object({
  daysAhead: z.number().default(30)
})
```
**Service Dependencies**:
```typescript
import { getGauges } from "~/modules/quality/quality.service";
```
**Returns**: Gauges due for calibration

#### 11. `getGaugeCalibrationHistory`
**Purpose**: Get calibration records for a gauge
**Input Schema**:
```typescript
z.object({
  gaugeId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getGaugeCalibrationRecordsByGaugeId } from "~/modules/quality/quality.service";
```
**Returns**: Calibration history with dates, results, certifications

#### 12. `recordGaugeCalibration`
**Purpose**: Record a gauge calibration event
**Input Schema**:
```typescript
z.object({
  gaugeId: z.string(),
  calibrationDate: z.string().describe("ISO date string"),
  nextCalibrationDate: z.string().describe("ISO date string"),
  calibratedBy: z.string().optional().describe("Technician/lab name"),
  certificationNumber: z.string().optional(),
  result: z.enum(["Pass", "Fail", "Out of Tolerance"]),
  notes: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { supabaseClient } from "~/modules/supabase";
```
**Returns**: Calibration record ID

#### 13. `getQualityDocument`
**Purpose**: Get quality document (procedure, specification)
**Input Schema**:
```typescript
z.object({
  documentId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getQualityDocument, getQualityDocumentSteps } from "~/modules/quality/quality.service";
```
**Returns**: Document with steps, versions, approval status

#### 14. `searchQualityDocuments`
**Purpose**: Find quality documents by type or name
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().optional(),
  documentType: z.enum(["Procedure", "Work Instruction", "Specification", "Form"]).optional(),
  status: z.enum(["Draft", "Review", "Approved", "Obsolete"]).optional()
})
```
**Service Dependencies**:
```typescript
import { getQualityDocuments } from "~/modules/quality/quality.service";
```
**Returns**: List of quality documents

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.3
- **Max Turns**: 12
- **Handoffs**: production-agent (for job context), inventory-agent (for lot traceability)

---

## Agent 5: Items Agent

### Purpose
Manages part/material lookup, bills of materials, make methods (routings), item configuration, and engineering data. Central reference for all item-related queries.

### Handoff Triggers
- Part searches, BOM inquiries, make methods
- "Find part...", "What's the BOM for...", "Show me the routing..."
- Item specifications, revisions, configurations

### Tools (15)

#### 1. `getItem`
**Purpose**: Get detailed item information
**Input Schema**:
```typescript
z.object({
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getItem, getItemManufacturing, getItemPlanning, getItemReplenishment } from "~/modules/items/items.service";
```
**Returns**: Complete item details including manufacturing, planning, and replenishment parameters

#### 2. `searchItems`
**Purpose**: Search items by description or readable ID
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().describe("Item description or readable ID")
})
```
**Service Dependencies**:
```typescript
import { generateEmbedding } from "~/modules/shared/shared.service";
import { supabaseClient } from "~/modules/supabase";
```
**Vector Search**: Use `items_search` stored procedure with embeddings
**Returns**: Matching items with basic details

#### 3. `getItemCost`
**Purpose**: Get current cost for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getItemCost, getItemCostHistory } from "~/modules/items/items.service";
```
**Returns**: Current cost, cost method, history

#### 4. `getItemSupplyDemand`
**Purpose**: Get supply and demand projections for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getItemDemand, getItemSupply } from "~/modules/items/items.service";
```
**Returns**: Open orders, forecasts, jobs, planned orders

#### 5. `getMakeMethod`
**Purpose**: Get BOM and routing for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  methodId: z.string().optional().describe("Defaults to active method")
})
```
**Service Dependencies**:
```typescript
import { getMakeMethodById, getMaterials, getMethodOperations } from "~/modules/items/items.service";
```
**Returns**: Complete make method with materials and operations

#### 6. `getMakeMethodTree`
**Purpose**: Get hierarchical BOM tree (multi-level)
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  methodId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getMakeMethodById } from "~/modules/items/items.service";
import { supabaseClient } from "~/modules/supabase";
```
**Returns**: Nested BOM structure with all levels

#### 7. `getMethodMaterials`
**Purpose**: Get material list for a make method (single-level BOM)
**Input Schema**:
```typescript
z.object({
  methodId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getMaterials } from "~/modules/items/items.service";
```
**Returns**: Material lines with quantities, units, scrap factors

#### 8. `getMethodOperations`
**Purpose**: Get routing operations for a make method
**Input Schema**:
```typescript
z.object({
  methodId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getMethodOperations } from "~/modules/items/items.service";
```
**Returns**: Operations with sequence, work centers, times, procedures

#### 9. `getItemRevisions`
**Purpose**: Get revision history for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getItem } from "~/modules/items/items.service";
import { supabaseClient } from "~/modules/supabase";
```
**Returns**: Revision history with dates, changes, status

#### 10. `getMaterial`
**Purpose**: Get material/raw material details
**Input Schema**:
```typescript
z.object({
  materialId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getMaterial, getMaterialDimensions } from "~/modules/items/items.service";
```
**Returns**: Material specifications, dimensions, grades

#### 11. `searchMaterials`
**Purpose**: Search raw materials by description
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().optional(),
  substanceId: z.string().optional(),
  gradeId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getMaterials } from "~/modules/items/items.service";
```
**Returns**: List of materials matching criteria

#### 12. `getConsumable`
**Purpose**: Get consumable item details
**Input Schema**:
```typescript
z.object({
  consumableId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getConsumable } from "~/modules/items/items.service";
```
**Returns**: Consumable details, usage rates

#### 13. `searchConsumables`
**Purpose**: Search consumables by description
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string()
})
```
**Service Dependencies**:
```typescript
import { getConsumables } from "~/modules/items/items.service";
```
**Returns**: List of consumables

#### 14. `getItemCustomerParts`
**Purpose**: Get customer part numbers for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  customerId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getItemCustomerParts } from "~/modules/items/items.service";
```
**Returns**: Customer-specific part numbers and descriptions

#### 15. `getItemWhereUsed`
**Purpose**: Get where an item is used (parent assemblies)
**Input Schema**:
```typescript
z.object({
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getMaterialUsedIn } from "~/modules/items/items.service";
```
**Returns**: List of parent items where this component is used

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.3
- **Max Turns**: 10
- **Handoffs**: production-agent (for job context), inventory-agent (for stock levels)

---

## Agent 6: Supplier Agent

### Purpose
Manages supplier relationships, interactions, quotes, evaluations, and onboarding. Complements the purchasing agent by focusing on supplier management rather than PO creation.

### Handoff Triggers
- Supplier inquiries, supplier management
- "Find supplier for...", "Log supplier interaction...", "Request supplier quote..."
- Supplier evaluations, certifications

### Tools (12)

#### 1. `getSupplier`
**Purpose**: Search for suppliers by name or capabilities
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().describe("Supplier name or description")
})
```
**Service Dependencies**:
```typescript
import { getSuppliers } from "~/modules/purchasing/purchasing.service";
import { generateEmbedding } from "~/modules/shared/shared.service";
import { supabaseClient } from "~/modules/supabase";
```
**Vector Search**: Use `suppliers_search` stored procedure
**Returns**: Supplier details with status, ratings, contact info

#### 2. `getSupplierContacts`
**Purpose**: Get all contacts for a supplier
**Input Schema**:
```typescript
z.object({
  supplierId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSupplierContacts } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Contact list with roles, email, phone

#### 3. `getSupplierLocations`
**Purpose**: Get supplier locations/facilities
**Input Schema**:
```typescript
z.object({
  supplierId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSupplierLocations } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Locations with addresses, types (office, plant, warehouse)

#### 4. `getSupplierParts`
**Purpose**: Get parts supplied by a supplier
**Input Schema**:
```typescript
z.object({
  supplierId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSupplierParts } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Parts with supplier part numbers, lead times, minimum order quantities

#### 5. `logSupplierInteraction`
**Purpose**: Record a supplier interaction/communication
**Input Schema**:
```typescript
z.object({
  supplierId: z.string(),
  interactionType: z.enum(["Email", "Phone", "Meeting", "Visit", "Other"]),
  date: z.string().describe("ISO date string"),
  subject: z.string(),
  notes: z.string(),
  contactId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { insertSupplierInteraction } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Interaction ID

#### 6. `getSupplierInteractions`
**Purpose**: Get interaction history with a supplier
**Input Schema**:
```typescript
z.object({
  supplierId: z.string(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getSupplierInteraction } from "~/modules/purchasing/purchasing.service";
```
**Returns**: List of interactions

#### 7. `getSupplierQuote`
**Purpose**: Get supplier quote details
**Input Schema**:
```typescript
z.object({
  quoteId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSupplierQuote, getSupplierQuoteLines } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Quote header, lines, pricing, lead times

#### 8. `searchSupplierQuotes`
**Purpose**: Find supplier quotes by supplier, date, status
**Input Schema**:
```typescript
z.object({
  supplierId: z.string().optional(),
  status: z.enum(["Requested", "Received", "Accepted", "Rejected", "Expired"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getSupplierQuotes } from "~/modules/purchasing/purchasing.service";
```
**Returns**: List of quotes

#### 9. `convertSupplierQuoteToOrder`
**Purpose**: Convert a supplier quote to a purchase order
**Input Schema**:
```typescript
z.object({
  quoteId: z.string(),
  orderDate: z.string().optional().describe("ISO date, defaults to today")
})
```
**Service Dependencies**:
```typescript
import { convertSupplierQuoteToOrder } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Created purchase order details

#### 10. `getSupplierProcesses`
**Purpose**: Get manufacturing processes a supplier can perform
**Input Schema**:
```typescript
z.object({
  supplierId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSupplierProcessesBySupplier } from "~/modules/purchasing/purchasing.service";
```
**Returns**: List of processes (e.g., machining, welding, coating)

#### 11. `getSuppliersForProcess`
**Purpose**: Find suppliers that can perform a specific process
**Input Schema**:
```typescript
z.object({
  processId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSupplierProcessesByProcess } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Suppliers capable of the process

#### 12. `getSupplierPurchaseHistory`
**Purpose**: Get purchase order history with a supplier
**Input Schema**:
```typescript
z.object({
  supplierId: z.string(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getPurchaseOrders } from "~/modules/purchasing/purchasing.service";
```
**Returns**: PO history with spend, on-time delivery metrics

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.3
- **Max Turns**: 10
- **Handoffs**: purchasing-agent (for PO creation), items-agent (for part details)

---

## Agent 7: Accounting Agent

### Purpose
Manages chart of accounts, currencies, payment terms, fiscal periods, and accounting configuration. Enables financial setup and inquiry through chat.

### Handoff Triggers
- Accounting setup, COA inquiries
- "What's the account for...", "Set up payment terms...", "Check fiscal period..."
- Currency management, posting groups

### Tools (11)

#### 1. `getAccount`
**Purpose**: Get account details from chart of accounts
**Input Schema**:
```typescript
z.object({
  accountId: z.string().optional(),
  accountNumber: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getAccount } from "~/modules/accounting/accounting.service";
```
**Returns**: Account details, type, category, balance

#### 2. `searchAccounts`
**Purpose**: Search chart of accounts by number or name
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string()
})
```
**Service Dependencies**:
```typescript
import { getAccounts } from "~/modules/accounting/accounting.service";
```
**Returns**: List of accounts matching criteria

#### 3. `getChartOfAccounts`
**Purpose**: Get complete chart of accounts hierarchy
**Input Schema**:
```typescript
z.object({
  accountType: z.enum(["Asset", "Liability", "Equity", "Revenue", "Expense"]).optional()
})
```
**Service Dependencies**:
```typescript
import { getChartOfAccounts } from "~/modules/accounting/accounting.service";
```
**Returns**: Hierarchical account structure

#### 4. `getAccountCategories`
**Purpose**: Get account categories and subcategories
**Input Schema**:
```typescript
z.object({
  accountType: z.enum(["Asset", "Liability", "Equity", "Revenue", "Expense"]).optional()
})
```
**Service Dependencies**:
```typescript
import { getAccountCategories, getAccountSubcategories } from "~/modules/accounting/accounting.service";
```
**Returns**: Categories with subcategories

#### 5. `getCurrency`
**Purpose**: Get currency details and exchange rates
**Input Schema**:
```typescript
z.object({
  currencyCode: z.string().describe("ISO currency code like USD, EUR")
})
```
**Service Dependencies**:
```typescript
import { getCurrencyByCode } from "~/modules/accounting/accounting.service";
```
**Returns**: Currency details, current exchange rate, symbol

#### 6. `getBaseCurrency`
**Purpose**: Get company's base currency
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getBaseCurrency } from "~/modules/accounting/accounting.service";
```
**Returns**: Base currency details

#### 7. `getAllCurrencies`
**Purpose**: Get all active currencies
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getCurrenciesList } from "~/modules/accounting/accounting.service";
```
**Returns**: List of currencies with exchange rates

#### 8. `getPaymentTerm`
**Purpose**: Get payment terms details
**Input Schema**:
```typescript
z.object({
  paymentTermId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getPaymentTerm } from "~/modules/accounting/accounting.service";
```
**Returns**: Payment terms with days, discount details

#### 9. `getAllPaymentTerms`
**Purpose**: Get all payment terms
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getPaymentTermsList } from "~/modules/accounting/accounting.service";
```
**Returns**: List of payment terms

#### 10. `getFiscalYearSettings`
**Purpose**: Get fiscal year configuration
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getFiscalYearSettings } from "~/modules/accounting/accounting.service";
```
**Returns**: Fiscal year start, periods, current period

#### 11. `getCurrentAccountingPeriod`
**Purpose**: Get current open accounting period
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getCurrentAccountingPeriod } from "~/modules/accounting/accounting.service";
```
**Returns**: Current period details, open status

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.2
- **Max Turns**: 8
- **Handoffs**: invoicing-agent (for billing context)

---

## Agent 8: Invoicing Agent

### Purpose
Manages purchase invoices, sales invoices, invoice creation from orders/shipments, and payment tracking. Enables accounts payable/receivable operations through chat.

### Handoff Triggers
- Invoice inquiries, invoice creation
- "Create invoice from...", "Find invoice...", "Check payment status..."
- AP/AR operations

### Tools (10)

#### 1. `getPurchaseInvoice`
**Purpose**: Get purchase invoice details
**Input Schema**:
```typescript
z.object({
  invoiceId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getPurchaseInvoice, getPurchaseInvoiceLines } from "~/modules/invoicing/invoicing.service";
```
**Returns**: Invoice header, lines, payment status, due date

#### 2. `searchPurchaseInvoices`
**Purpose**: Find purchase invoices by supplier, status, date
**Input Schema**:
```typescript
z.object({
  supplierId: z.string().optional(),
  status: z.enum(["Draft", "Submitted", "Approved", "Paid", "Overdue"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getPurchaseInvoices } from "~/modules/invoicing/invoicing.service";
```
**Returns**: List of purchase invoices

#### 3. `createPurchaseInvoiceFromPO`
**Purpose**: Create a purchase invoice from a purchase order
**Input Schema**:
```typescript
z.object({
  purchaseOrderId: z.string(),
  invoiceDate: z.string().describe("ISO date string"),
  supplierInvoiceNumber: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { createPurchaseInvoiceFromPurchaseOrder } from "~/modules/invoicing/invoicing.service";
```
**Returns**: Created invoice details

#### 4. `updatePurchaseInvoiceStatus`
**Purpose**: Update purchase invoice status (approve, pay)
**Input Schema**:
```typescript
z.object({
  invoiceId: z.string(),
  status: z.enum(["Draft", "Submitted", "Approved", "Paid"])
})
```
**Service Dependencies**:
```typescript
import { updatePurchaseInvoiceStatus } from "~/modules/invoicing/invoicing.service";
```
**Returns**: Updated invoice

#### 5. `getSalesInvoice`
**Purpose**: Get sales invoice details
**Input Schema**:
```typescript
z.object({
  invoiceId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getSalesInvoice, getSalesInvoiceLines } from "~/modules/invoicing/invoicing.service";
```
**Returns**: Invoice header, lines, payment status, due date

#### 6. `searchSalesInvoices`
**Purpose**: Find sales invoices by customer, status, date
**Input Schema**:
```typescript
z.object({
  customerId: z.string().optional(),
  status: z.enum(["Draft", "Submitted", "Paid", "Overdue"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getSalesInvoices } from "~/modules/invoicing/invoicing.service";
```
**Returns**: List of sales invoices

#### 7. `createSalesInvoiceFromOrder`
**Purpose**: Create a sales invoice from a sales order
**Input Schema**:
```typescript
z.object({
  salesOrderId: z.string(),
  invoiceDate: z.string().describe("ISO date string")
})
```
**Service Dependencies**:
```typescript
import { createSalesInvoiceFromSalesOrder } from "~/modules/invoicing/invoicing.service";
```
**Returns**: Created invoice details

#### 8. `createSalesInvoiceFromShipment`
**Purpose**: Create a sales invoice from a shipment
**Input Schema**:
```typescript
z.object({
  shipmentId: z.string(),
  invoiceDate: z.string().describe("ISO date string")
})
```
**Service Dependencies**:
```typescript
import { createSalesInvoiceFromShipment } from "~/modules/invoicing/invoicing.service";
```
**Returns**: Created invoice details

#### 9. `updateSalesInvoiceStatus`
**Purpose**: Update sales invoice status (submit, mark paid)
**Input Schema**:
```typescript
z.object({
  invoiceId: z.string(),
  status: z.enum(["Draft", "Submitted", "Paid"])
})
```
**Service Dependencies**:
```typescript
import { updateSalesInvoiceStatus } from "~/modules/invoicing/invoicing.service";
```
**Returns**: Updated invoice

#### 10. `getOverdueInvoices`
**Purpose**: Get overdue invoices (AR or AP)
**Input Schema**:
```typescript
z.object({
  invoiceType: z.enum(["Purchase", "Sales"])
})
```
**Service Dependencies**:
```typescript
import { getPurchaseInvoices, getSalesInvoices } from "~/modules/invoicing/invoicing.service";
```
**Returns**: List of overdue invoices with aging details

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.2
- **Max Turns**: 10
- **Handoffs**: sales-agent (for order context), purchasing-agent (for PO context)

---

## Agent 9: Resources Agent

### Purpose
Manages work centers, locations, shifts, employee abilities, contractors, and partners. Enables resource planning and capacity management through chat.

### Handoff Triggers
- Resource inquiries, capacity planning
- "Find work center...", "Check employee abilities...", "Get contractor info..."
- Location management, shift schedules

### Tools (13)

#### 1. `getWorkCenter`
**Purpose**: Get work center details
**Input Schema**:
```typescript
z.object({
  workCenterId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getWorkCenter } from "~/modules/resources/resources.service";
```
**Returns**: Work center details, capacity, efficiency, location

#### 2. `searchWorkCenters`
**Purpose**: Find work centers by name or location
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().optional(),
  locationId: z.string().optional(),
  active: z.boolean().optional()
})
```
**Service Dependencies**:
```typescript
import { getWorkCenters, getWorkCentersByLocation } from "~/modules/resources/resources.service";
```
**Returns**: List of work centers

#### 3. `getWorkCenterCapacity`
**Purpose**: Get work center capacity and utilization
**Input Schema**:
```typescript
z.object({
  workCenterId: z.string(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getWorkCenter } from "~/modules/resources/resources.service";
import { getActiveJobOperationsByLocation } from "~/modules/production/production.service";
```
**Returns**: Available capacity, scheduled load, utilization %

#### 4. `getLocation`
**Purpose**: Get location/facility details
**Input Schema**:
```typescript
z.object({
  locationId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getLocation } from "~/modules/resources/resources.service";
```
**Returns**: Location details, address, type, active status

#### 5. `getAllLocations`
**Purpose**: Get all locations
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getLocationsList } from "~/modules/resources/resources.service";
```
**Returns**: List of locations

#### 6. `getAbility`
**Purpose**: Get ability/skill details
**Input Schema**:
```typescript
z.object({
  abilityId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getAbility } from "~/modules/resources/resources.service";
```
**Returns**: Ability details, curve type

#### 7. `getAllAbilities`
**Purpose**: Get all abilities/skills
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getAbilitiesList } from "~/modules/resources/resources.service";
```
**Returns**: List of abilities

#### 8. `getEmployeeAbilities`
**Purpose**: Get abilities for an employee
**Input Schema**:
```typescript
z.object({
  employeeId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getEmployeeAbilities } from "~/modules/resources/resources.service";
```
**Returns**: Employee's abilities with proficiency levels

#### 9. `getEmployeesWithAbility`
**Purpose**: Find employees with a specific ability
**Input Schema**:
```typescript
z.object({
  abilityId: z.string(),
  minimumLevel: z.number().optional().describe("Minimum proficiency level 1-5")
})
```
**Service Dependencies**:
```typescript
import { getEmployeeAbilities } from "~/modules/resources/resources.service";
```
**Returns**: Employees with that ability and their levels

#### 10. `getShift`
**Purpose**: Get shift schedule details
**Input Schema**:
```typescript
z.object({
  shiftId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getShift } from "~/modules/resources/resources.service";
```
**Returns**: Shift details, start/end times, days

#### 11. `getAllShifts`
**Purpose**: Get all shift schedules
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { getShiftsList } from "~/modules/resources/resources.service";
```
**Returns**: List of shifts

#### 12. `getContractor`
**Purpose**: Get contractor/subcontractor details
**Input Schema**:
```typescript
z.object({
  contractorId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getContractor } from "~/modules/resources/resources.service";
```
**Returns**: Contractor details, abilities, rates

#### 13. `searchContractors`
**Purpose**: Find contractors by name or ability
**Input Schema**:
```typescript
z.object({
  searchTerm: z.string().optional(),
  abilityId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getContractors } from "~/modules/resources/resources.service";
```
**Returns**: List of contractors

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.3
- **Max Turns**: 10
- **Handoffs**: production-agent (for scheduling context)

---

## Agent 10: Planning Agent

### Purpose
Manages MRP, demand forecasting, capacity planning, and kanban replenishment. Enables supply chain planning and what-if analysis through chat.

### Handoff Triggers
- Planning inquiries, MRP, demand forecasting
- "Run MRP...", "What's the forecast for...", "Check kanban status..."
- Supply chain planning, capacity analysis

### Tools (12)

#### 1. `getItemSupplyDemand`
**Purpose**: Get supply and demand details for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getItemDemand, getItemSupply } from "~/modules/items/items.service";
```
**Returns**: Open demand (orders, forecasts), open supply (POs, jobs, planned orders)

#### 2. `getItemReplenishmentSettings`
**Purpose**: Get replenishment parameters for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string()
})
```
**Service Dependencies**:
```typescript
import { getItemReplenishment } from "~/modules/items/items.service";
```
**Returns**: Replenishment method, reorder point, order quantity, lead time

#### 3. `getDemandForecast`
**Purpose**: Get demand forecast for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getDemandForecasts } from "~/modules/production/production.service";
```
**Returns**: Forecast by period

#### 4. `getDemandProjections`
**Purpose**: Get demand projections (statistical forecast)
**Input Schema**:
```typescript
z.object({
  itemId: z.string(),
  periodsAhead: z.number().default(12)
})
```
**Service Dependencies**:
```typescript
import { getDemandProjections } from "~/modules/production/production.service";
```
**Returns**: Projected demand with confidence intervals

#### 5. `getMrpStatus`
**Purpose**: Get last MRP run status and next scheduled run
**Input Schema**:
```typescript
z.object({})
```
**Service Dependencies**:
```typescript
import { supabaseClient } from "~/modules/supabase";
```
**Returns**: Last run time, status, next scheduled run

#### 6. `getPlannedOrders`
**Purpose**: Get MRP-generated planned orders
**Input Schema**:
```typescript
z.object({
  itemId: z.string().optional(),
  locationId: z.string().optional(),
  orderType: z.enum(["Purchase", "Make"]).optional()
})
```
**Service Dependencies**:
```typescript
import { supabaseClient } from "~/modules/supabase";
```
**Returns**: Planned orders with quantities, due dates, firm status

#### 7. `getKanbanStatus`
**Purpose**: Get kanban card status for an item
**Input Schema**:
```typescript
z.object({
  itemId: z.string().optional(),
  locationId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getKanbans } from "~/modules/inventory/inventory.service";
```
**Returns**: Kanban cards with status, trigger levels, current quantities

#### 8. `getTriggeredKanbans`
**Purpose**: Get kanbans that have been triggered (need replenishment)
**Input Schema**:
```typescript
z.object({
  locationId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getKanbans } from "~/modules/inventory/inventory.service";
```
**Returns**: Triggered kanbans needing action

#### 9. `getItemShortages`
**Purpose**: Get items with projected shortages
**Input Schema**:
```typescript
z.object({
  locationId: z.string().optional(),
  daysAhead: z.number().default(30)
})
```
**Service Dependencies**:
```typescript
import { getItemDemand, getItemSupply } from "~/modules/items/items.service";
```
**Returns**: Items with projected stockouts and shortage quantities

#### 10. `getCapacityAnalysis`
**Purpose**: Get capacity requirements vs. available capacity
**Input Schema**:
```typescript
z.object({
  workCenterId: z.string().optional(),
  locationId: z.string().optional(),
  fromDate: z.string(),
  toDate: z.string()
})
```
**Service Dependencies**:
```typescript
import { getWorkCenters } from "~/modules/resources/resources.service";
import { getJobOperations } from "~/modules/production/production.service";
```
**Returns**: Required vs. available hours by work center and period

#### 11. `getOpenSalesOrders`
**Purpose**: Get open sales orders (demand source)
**Input Schema**:
```typescript
z.object({
  itemId: z.string().optional(),
  customerId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getSalesOrders } from "~/modules/sales/sales.service";
```
**Returns**: Open sales orders with requested dates

#### 12. `getOpenPurchaseOrders`
**Purpose**: Get open purchase orders (supply source)
**Input Schema**:
```typescript
z.object({
  itemId: z.string().optional(),
  supplierId: z.string().optional()
})
```
**Service Dependencies**:
```typescript
import { getPurchaseOrders } from "~/modules/purchasing/purchasing.service";
```
**Returns**: Open POs with expected receipt dates

### Agent Configuration
- **Model**: GPT-4o
- **Temperature**: 0.3
- **Max Turns**: 10
- **Handoffs**: inventory-agent (for stock context), production-agent (for job context)

---

## Implementation Priority Recommendations

### Phase 1 (High Impact, Core Operations)
1. **Sales Agent** - Customer-facing operations, high user interaction
2. **Inventory Agent** - Daily operations, high transaction volume
3. **Production Agent** - Shop floor operations, real-time needs

### Phase 2 (Supporting Functions)
4. **Items Agent** - Reference data, supports other agents
5. **Quality Agent** - Compliance and traceability
6. **Supplier Agent** - Supplier relationship management

### Phase 3 (Advanced Features)
7. **Invoicing Agent** - Financial operations
8. **Planning Agent** - Strategic planning and MRP
9. **Resources Agent** - Resource management

### Phase 4 (Configuration)
10. **Accounting Agent** - Setup and configuration

---

## Orchestration Agent Updates

The orchestration agent should be updated to include handoffs to all new agents:

```typescript
handoffs: [
  purchasingAgent,
  salesAgent,
  inventoryAgent,
  productionAgent,
  qualityAgent,
  itemsAgent,
  supplierAgent,
  accountingAgent,
  invoicingAgent,
  resourcesAgent,
  planningAgent,
  searchAgent
]
```

Updated instructions should include examples for each agent's domain to improve routing accuracy.

---

## Cross-Agent Collaboration Patterns

### Common Handoff Scenarios

1. **Sales → Items → Inventory**: Customer inquiry about product availability
2. **Sales → Production → Inventory**: Custom order with manufacturing required
3. **Purchasing → Supplier → Items**: Sourcing new parts from suppliers
4. **Production → Quality → Inventory**: Production with quality inspection before receipt
5. **Sales → Invoicing → Accounting**: Order fulfillment to billing
6. **Planning → Production → Inventory**: MRP-driven job creation and material allocation
7. **Quality → Production → Supplier**: Non-conformance investigation and supplier notification

### Multi-Agent Workflows

Example: "Create a quote for 100 units of part X for customer Y, check availability, and if we need to manufacture, estimate the lead time"

**Flow**:
1. Orchestration → Sales Agent
2. Sales Agent → Items Agent (get part details)
3. Sales Agent → Inventory Agent (check stock)
4. Sales Agent → Production Agent (estimate manufacturing time if needed)
5. Sales Agent creates quote with accurate lead time
6. Return to user

---

## Vector Search Expansion

### Recommended Stored Procedures to Create

Beyond the existing `items_search` and `suppliers_search`:

1. **`customers_search`** - Fuzzy customer search by name/description
2. **`jobs_search`** - Job search by part description or job notes
3. **`procedures_search`** - Work instruction search by content
4. **`issues_search`** - Quality issue search by description

### Implementation Pattern

```sql
CREATE OR REPLACE FUNCTION customers_search(
  query_embedding vector(1536),
  company_id text,
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM customer c
  WHERE c."companyId" = company_id
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Tool Configuration Best Practices

### Zod Schema Design
- Use descriptive field names and descriptions for better LLM understanding
- Mark optional fields appropriately with `.optional()`
- Use enums for constrained values to prevent hallucination
- Include units in descriptions (e.g., "Days", "ISO date string")

### Service Import Strategy
```typescript
// ❌ Avoid importing entire service modules
import * as salesService from "~/modules/sales/sales.service";

// ✅ Import only what you need
import { getCustomer, getQuote } from "~/modules/sales/sales.service";
```

### Error Handling Pattern
```typescript
execute: async (input, { context }) => {
  try {
    const result = await getCustomer(context.client, input.customerId);

    if (!result) {
      return {
        success: false,
        message: `Customer ${input.customerId} not found`
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: `Error retrieving customer: ${error.message}`
    };
  }
}
```

### Multi-Step Confirmation Pattern
For destructive or important operations (like creating POs, jobs, invoices):

```typescript
// Step 1: Tool gathers data and presents summary
// Step 2: LLM asks user for confirmation
// Step 3: Tool executes with confirmed: true flag

z.object({
  // ... input fields
  confirmed: z.boolean().optional().describe("Set to true after user confirms")
})
```

---

## Testing Strategy

### Unit Testing Tools
Each tool should have tests covering:
- Valid input scenarios
- Invalid input handling
- Permission checks (company scoping)
- Empty result sets
- Error conditions

### Integration Testing Agents
End-to-end tests for common workflows:
- User asks → agent responds → tool executes → correct data returned
- Multi-agent handoffs work correctly
- Context is preserved across tool calls

### Performance Considerations
- Vector searches should complete in < 500ms
- Service calls should use proper indexing
- Consider caching for reference data (abilities, locations, etc.)
- Limit result sets with pagination where appropriate

---

## Documentation Requirements

Each agent should have:
1. **Agent Overview**: Purpose, capabilities, example queries
2. **Tool Reference**: Input/output specs for each tool
3. **Workflow Diagrams**: Common multi-step processes
4. **Handoff Map**: When to route to other agents
5. **Examples**: Sample conversations showing agent in action

---

## Maintenance and Evolution

### Metrics to Track
- Tool usage frequency (identify unused tools)
- Agent handoff patterns (optimize routing)
- Error rates by tool
- User satisfaction scores
- Average conversation length (efficiency)

### Version Control
- Tag agent versions with tool changes
- Maintain changelog for prompt modifications
- A/B test temperature and max turns settings
- Monitor token usage per agent

### Future Enhancements
- **Reporting Agent**: Ad-hoc reporting and analytics
- **HR Agent**: Time tracking, leave requests, employee info
- **Maintenance Agent**: Equipment maintenance, work orders
- **Shipping Agent**: Carrier integration, tracking, freight quotes
- **Project Agent**: Project management, milestones, resources

---

## Conclusion

This expansion plan provides a comprehensive chat interface covering all major ERP functions. Each agent follows established patterns from the purchasing agent while being specialized for its domain.

**Total Proposed Tools**: 136 new tools across 10 agents

The phased implementation approach allows for iterative deployment, user feedback, and refinement before adding the next set of agents.

### Next Steps
1. Review and approve agent priorities
2. Create tool implementation tasks
3. Develop stored procedures for vector search
4. Implement Phase 1 agents (Sales, Inventory, Production)
5. User testing and feedback
6. Iterate and expand to Phase 2+
