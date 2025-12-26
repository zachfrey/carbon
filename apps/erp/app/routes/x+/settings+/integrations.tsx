import { error } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { integrations as availableIntegrations } from "@carbon/ee";
import {
  type LoaderFunctionArgs,
  Outlet,
  redirect,
  useLoaderData
} from "react-router";
import { getIntegrations, IntegrationsList } from "~/modules/settings";
import { path } from "~/utils/path";

export const config = {
  runtime: "nodejs"
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    view: "settings"
  });

  const integrations = await getIntegrations(client, companyId);
  if (integrations.error) {
    throw redirect(
      path.to.settings,
      await flash(
        request,
        error(integrations.error, "Failed to load integrations")
      )
    );
  }

  return {
    installedIntegrations: (integrations.data
      .filter((i) => i.active)
      .map((i) => i.id) ?? []) as string[],
    state: crypto.randomUUID()
  };
}

export default function IntegrationsRoute() {
  const { installedIntegrations } = useLoaderData<typeof loader>();

  return (
    <>
      <IntegrationsList
        installedIntegrations={installedIntegrations}
        availableIntegrations={availableIntegrations}
      />
      <Outlet />
    </>
  );
}
