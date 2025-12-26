/**
 * QuickBooks Webhook Handler
 *
 * This endpoint receives webhook notifications from QuickBooks when entities
 * (customers, vendors, etc.) are created, updated, or deleted in QuickBooks.
 *
 * The webhook handler:
 * 1. Validates the webhook payload structure
 * 2. Verifies the webhook signature for security
 * 3. Looks up the company integration by QuickBooks realm ID
 * 4. Triggers background sync jobs to process the entity changes
 *
 * Supported entity types:
 * - Customer: Synced to Carbon's customer table
 * - Vendor: Synced to Carbon's supplier table
 *
 * The actual sync logic is handled asynchronously by the accounting-sync
 * background job to prevent webhook timeouts and ensure reliability.
 */

import { getCarbonServiceRole, QUICKBOOKS_WEBHOOK_SECRET } from "@carbon/auth";
import { tasks } from "@trigger.dev/sdk/v3";
import crypto from "crypto";
import { type ActionFunctionArgs, data } from "react-router";
import { z } from "zod";

export const config = {
  runtime: "nodejs"
};

const quickbooksEventValidator = z.object({
  eventNotifications: z.array(
    z.object({
      realmId: z.string(),
      dataChangeEvent: z.object({
        entities: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            operation: z.enum(["Create", "Update", "Delete"])
          })
        )
      })
    })
  )
});

function verifyQuickBooksSignature(
  payload: string,
  signature: string
): boolean {
  if (!QUICKBOOKS_WEBHOOK_SECRET) {
    console.warn("QUICKBOOKS_WEBHOOK_SECRET is not set");
    return true;
  }

  const expectedSignature = crypto
    .createHmac("sha256", QUICKBOOKS_WEBHOOK_SECRET)
    .update(payload)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function triggerAccountingSync(
  companyId: string,
  realmId: string,
  entities: Array<{
    entityType: "customer" | "vendor";
    entityId: string;
    operation: "Create" | "Update" | "Delete";
  }>
) {
  // Prepare the payload for the accounting sync job
  const payload = {
    companyId,
    provider: "quickbooks" as const,
    syncType: "webhook" as const,
    syncDirection: "fromAccounting" as const,
    entities: entities.map((entity) => ({
      entityType: entity.entityType,
      entityId: entity.entityId,
      operation: entity.operation.toLowerCase() as
        | "create"
        | "update"
        | "delete",
      externalId: entity.entityId // In QuickBooks, the entity ID is the external ID
    })),
    metadata: {
      tenantId: realmId,
      webhookId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }
  };

  // Trigger the background job using Trigger.dev
  const handle = await tasks.trigger("accounting-sync", payload);

  console.log(
    `Triggered accounting sync job ${handle.id} for ${entities.length} entities`
  );

  return handle;
}

export async function action({ request, params }: ActionFunctionArgs) {
  const serviceRole = await getCarbonServiceRole();

  // Parse and validate the webhook payload
  const payload = await request.clone().json();
  const parsedPayload = quickbooksEventValidator.safeParse(payload);

  if (!parsedPayload.success) {
    console.error("Invalid QuickBooks webhook payload:", parsedPayload.error);
    return data(
      {
        success: false,
        error: "Invalid payload format"
      },
      { status: 400 }
    );
  }

  // Verify webhook signature for security
  const payloadText = await request.text();
  const signatureHeader = request.headers.get("intuit-signature");

  if (!signatureHeader) {
    console.warn("QuickBooks webhook received without signature");
    return data(
      {
        success: false,
        error: "Missing signature"
      },
      { status: 401 }
    );
  }

  const requestIsValid = verifyQuickBooksSignature(
    payloadText,
    signatureHeader
  );

  if (!requestIsValid) {
    console.error("QuickBooks webhook signature verification failed");
    return data(
      {
        success: false,
        error: "Invalid signature"
      },
      { status: 401 }
    );
  }

  console.log(
    "Processing QuickBooks webhook with",
    parsedPayload.data.eventNotifications.length,
    "events"
  );

  const events = parsedPayload.data.eventNotifications;
  const syncJobs = [];
  const errors = [];

  // Process each event notification
  for (const event of events) {
    try {
      const { realmId, dataChangeEvent } = event;

      // Find the company integration for this QuickBooks realm
      const companyIntegration = await serviceRole
        .from("companyIntegration")
        .select("*")
        .eq("metadata->>tenantId", realmId)
        .eq("id", "quickbooks")
        .single();

      if (companyIntegration.error || !companyIntegration.data.companyId) {
        console.error(`No QuickBooks integration found for realm ${realmId}`);
        errors.push({
          realmId,
          error: "Integration not found"
        });
        continue;
      }

      const companyId = companyIntegration.data.companyId;
      const { entities } = dataChangeEvent;

      // Group entities by type for efficient batch processing
      const entitiesToSync: Array<{
        entityType: "customer" | "vendor";
        entityId: string;
        operation: "Create" | "Update" | "Delete";
      }> = [];

      for (const entity of entities) {
        const { id, name, operation } = entity;

        // Log each entity change for debugging
        console.log(
          `QuickBooks ${operation}: ${name} ${id} (realm: ${realmId})`
        );

        // Map QuickBooks entity types to our internal types
        if (name === "Customer") {
          entitiesToSync.push({
            entityType: "customer",
            entityId: id,
            operation
          });
        } else if (name === "Vendor") {
          entitiesToSync.push({
            entityType: "vendor",
            entityId: id,
            operation
          });
        } else {
          console.log(`Skipping unsupported entity type: ${name}`);
        }
      }

      // Trigger background sync job if there are entities to process
      if (entitiesToSync.length > 0) {
        try {
          const jobHandle = await triggerAccountingSync(
            companyId,
            realmId,
            entitiesToSync
          );
          syncJobs.push({
            id: jobHandle.id,
            companyId,
            realmId,
            entityCount: entitiesToSync.length
          });
        } catch (error) {
          console.error("Failed to trigger sync job:", error);
          errors.push({
            realmId,
            error:
              error instanceof Error ? error.message : "Failed to trigger job"
          });
        }
      }
    } catch (error) {
      console.error("Error processing event:", error);
      errors.push({
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  // Return detailed response
  return {
    success: errors.length === 0,
    jobsTriggered: syncJobs.length,
    jobs: syncJobs,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString()
  };
}
