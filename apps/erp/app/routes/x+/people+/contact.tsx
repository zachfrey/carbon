import { error } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { VStack } from "@carbon/react";
import type { LoaderFunctionArgs } from "react-router";
import { Outlet, redirect, useLoaderData } from "react-router";
import { getContacts } from "~/modules/people";
import { ContactTable } from "~/modules/people/ui/Contact";
import { path } from "~/utils/path";
import { getGenericQueryFilters } from "~/utils/query";

export async function loader({ request }: LoaderFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    view: "sales",
    role: "employee"
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const search = searchParams.get("search");

  const { limit, offset, sorts, filters } =
    getGenericQueryFilters(searchParams);

  const contacts = await getContacts(client, companyId, {
    search,
    limit,
    offset,
    sorts,
    filters
  });

  if (contacts.error) {
    throw redirect(
      path.to.authenticatedRoot,
      await flash(request, error(contacts.error, "Error loading contacts"))
    );
  }

  return {
    contacts: contacts.data ?? [],
    count: contacts.count
  };
}

export default function ResourcesContactRoute() {
  const { contacts, count } = useLoaderData<typeof loader>();

  return (
    <VStack spacing={0} className="h-full">
      <ContactTable data={contacts} count={count ?? 0} />
      <Outlet />
    </VStack>
  );
}
