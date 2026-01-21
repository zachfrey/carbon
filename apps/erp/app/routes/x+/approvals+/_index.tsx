import { error, getCarbonServiceRole } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { VStack } from "@carbon/react";
import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";
import {
  type ApprovalDocumentType,
  type ApprovalStatus,
  getApprovalsForUser
} from "~/modules/approvals";
import { ApprovalsTable } from "~/modules/approvals/ui";
import type { Handle } from "~/utils/handle";
import { path } from "~/utils/path";
import { getGenericQueryFilters } from "~/utils/query";

export const handle: Handle = {
  breadcrumb: "Inbox",
  to: path.to.approvals
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { companyId, userId } = await requirePermissions(request, {
    role: "employee"
  });

  const serviceRole = getCarbonServiceRole();

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const documentType = searchParams.get("documentType");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const { limit, offset, sorts, filters } =
    getGenericQueryFilters(searchParams);

  const approvals = await getApprovalsForUser(serviceRole, userId, companyId, {
    documentType: documentType as ApprovalDocumentType,
    status: status as ApprovalStatus,
    dateFrom,
    dateTo,
    limit,
    offset,
    sorts,
    filters
  });

  if (approvals.error) {
    console.error(approvals.error);
    throw redirect(
      path.to.authenticatedRoot,
      await flash(request, error(approvals.error, "Error loading approvals"))
    );
  }

  return {
    approvals: approvals.data ?? [],
    count: approvals.count ?? 0
  };
}

export default function ApprovalsInboxRoute() {
  const { approvals, count } = useLoaderData<typeof loader>();

  return (
    <VStack spacing={0} className="h-full">
      <ApprovalsTable data={approvals} count={count} />
    </VStack>
  );
}
