import type {
  CreateEmailOptions,
  CreateEmailRequestOptions,
  CreateEmailResponse,
} from "resend";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendEmail = async (
  payload: CreateEmailOptions,
  options?: CreateEmailRequestOptions
): Promise<CreateEmailResponse> => {
  if (process.env.DISABLE_RESEND) {
    console.log(payload, options);
    return {
      error: null,
      data: null,
    };
  }
  return resend.emails.send(payload, options);
};
