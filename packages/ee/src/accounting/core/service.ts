import type { Database } from "@carbon/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import z from "zod";
import { QuickBooksProvider, XeroProvider } from "../providers";
import {
  ProviderCredentials,
  ProviderCredentialsSchema,
  ProviderID
} from "./models";

export const getAccountingIntegration = async <T extends ProviderID>(
  client: SupabaseClient<Database>,
  companyId: string,
  provider: T
) => {
  const integration = await client
    .from("companyIntegration")
    .select("*")
    .eq("companyId", companyId)
    .eq("id", provider)
    .single();

  if (integration.error || !integration.data) {
    throw new Error(
      `No ${provider} integration found for company ${companyId}`
    );
  }

  const config = ProviderCredentialsSchema.safeParse(integration.data.metadata);

  if (!config.success) {
    console.error(integration.error);
    throw new Error("Invalid provider config");
  }

  return {
    id: provider as T,
    config: config.data
  };
};

export const getProviderIntegration = (
  client: SupabaseClient<Database>,
  companyId: string,
  provider: string,
  config: ProviderCredentials
) => {
  const { accessToken, refreshToken, tenantId } = config;

  // Create a callback function to update the integration metadata when tokens are refreshed
  const onTokenRefresh = async (auth: ProviderCredentials) => {
    try {
      const update: ProviderCredentials = {
        ...auth,
        expiresAt:
          auth.expiresAt || new Date(Date.now() + 3600000).toISOString(), // Default to 1 hour if not provided
        tenantId: auth.tenantId || tenantId
      };

      await client
        .from("companyIntegration")
        .update({ metadata: update })
        .eq("companyId", companyId)
        .eq("id", provider);

      console.log(
        `Updated ${provider} integration metadata for company ${companyId}`
      );
    } catch (error) {
      console.error(
        `Failed to update ${provider} integration metadata:`,
        error
      );
    }
  };

  switch (provider) {
    case "quickbooks": {
      const environment = process.env.QUICKBOOKS_ENVIRONMENT as
        | "production"
        | "sandbox";
      return new QuickBooksProvider({
        companyId,
        tenantId,
        environment: environment || "sandbox",
        clientId: process.env.QUICKBOOKS_CLIENT_ID!,
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
        redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
        onTokenRefresh
      });
    }
    case "xero":
      return new XeroProvider({
        companyId,
        tenantId,
        accessToken,
        refreshToken,
        clientId: process.env.XERO_CLIENT_ID!,
        clientSecret: process.env.XERO_CLIENT_SECRET!,
        redirectUri: process.env.XERO_REDIRECT_URI,
        onTokenRefresh
      });
    // Add other providers as needed
    // case "sage":
    //   return new SageProvider(config);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};
