import { AIDevtools } from "@ai-sdk-tools/devtools";
import { getAppUrl } from "@carbon/auth";
import { path } from "~/utils/path";

export function DevTools() {
  return (
    <AIDevtools
      config={{
        streamCapture: {
          enabled: true,
          endpoint: `${getAppUrl()}${path.to.api.chat}`,
          autoConnect: true,
        },
      }}
    />
  );
}
