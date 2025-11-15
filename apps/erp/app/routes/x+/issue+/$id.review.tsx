import { assertIsPost, error } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { validator } from "@carbon/form";
import { json, type ActionFunctionArgs } from "@vercel/remix";
import {
  insertIssueReviewer,
  nonConformanceReviewerValidator,
} from "~/modules/quality";

export async function action({ request, params }: ActionFunctionArgs) {
  assertIsPost(request);
  const { client, companyId, userId } = await requirePermissions(request, {
    update: "quality",
  });

  const { id } = params;
  if (!id) throw new Error("Non-conformance ID is required");

  const formData = await request.formData();
  const validation = await validator(nonConformanceReviewerValidator).validate(
    formData
  );

  if (validation.error) {
    return json(
      {
        success: false,
      },
      await flash(request, error(validation.error, "Invalid reviewer"))
    );
  }

  const updateCurrency = await insertIssueReviewer(client, {
    ...validation.data,
    nonConformanceId: id,
    companyId,
    createdBy: userId,
  });

  if (updateCurrency.error) {
    return json(
      {
        success: false,
      },
      await flash(
        request,
        error(updateCurrency.error, "Failed to insert reviewer")
      )
    );
  }

  return json({
    success: true,
  });
}
