import { getCarbonServiceRole } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { validator } from "@carbon/form";
import type { ActionFunctionArgs } from "react-router";
import { suggestionValidator } from "~/services/models";

export async function action({ request }: ActionFunctionArgs) {
  const { userId, companyId } = await requirePermissions(request, {});

  const formData = await request.formData();
  const validation = await validator(suggestionValidator).validate(formData);

  if (validation.error) {
    return {
      success: false,
      message: "Failed to submit suggestion"
    };
  }

  const {
    attachmentPath,
    emoji,
    suggestion,
    path,
    userId: formUserId
  } = validation.data;
  const serviceRole = await getCarbonServiceRole();

  const insertSuggestion = await serviceRole.from("suggestion").insert([
    {
      suggestion,
      emoji,
      path,
      attachmentPath: attachmentPath || null,
      userId: formUserId || null,
      companyId
    }
  ]);

  if (insertSuggestion.error) {
    return {
      success: false,
      message: "Failed to submit suggestion"
    };
  }

  return { success: true, message: "Suggestion submitted" };
}
