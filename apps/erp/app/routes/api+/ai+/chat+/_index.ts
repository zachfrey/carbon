import { requirePermissions } from "@carbon/auth/auth.server";
import type { ActionFunctionArgs } from "@vercel/remix";
import { smoothStream } from "ai";
import { orchestrationAgent } from "./agents/orchestration-agent";
import { createChatContext } from "./agents/shared/context";

export const config = {
  runtime: "node",
};

export async function action({ request }: ActionFunctionArgs) {
  const { client, userId, companyId } = await requirePermissions(request, {});

  const payload = await request.json();

  console.log({
    function: "chat",
    ...payload,
  });

  const {
    message,
    id,
    timezone,
    locale,
    agentChoice,
    toolChoice,
    country,
    city,
    fullName,
    companyName,
    baseCurrency,
  } = payload;

  const appContext = createChatContext({
    userId,
    companyId,
    client,
    fullName,
    companyName,
    country,
    city,
    chatId: id,
    timezone,
    locale,
    baseCurrency,
  });

  return orchestrationAgent.toUIMessageStream({
    message,
    strategy: "auto",
    maxRounds: 5,
    maxSteps: 20,
    context: appContext,
    agentChoice,
    toolChoice,
    experimental_transform: smoothStream({
      chunking: "word",
    }),
    sendSources: true,
  });
}
