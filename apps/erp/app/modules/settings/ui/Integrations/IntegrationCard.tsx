import type { IntegrationConfig } from "@carbon/ee";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@carbon/react";
import { useRouteData } from "@carbon/remix";
import { Link, useFetcher, useNavigate } from "react-router";
import { path } from "~/utils/path";

export function IntegrationCard({
  integration,
  installed
}: {
  integration: IntegrationConfig;
  installed: boolean;
}) {
  const fetcher = useFetcher<{}>();
  const navigate = useNavigate();
  const routeData = useRouteData<{ state: string }>(path.to.integrations);

  const getOauthUrl = (integration: IntegrationConfig) => {
    if ("oauth" in integration && !!integration.oauth) {
      const { clientId, redirectUri, scopes } = integration.oauth;
      const encodedRedirectUri = encodeURIComponent(
        `${window.location.origin}${redirectUri}`
      );
      const encodedScopes = encodeURIComponent(scopes.join(" "));
      const encodedState = encodeURIComponent(
        routeData?.state ?? Math.random().toString(36).substring(2, 15)
      );

      return `${integration.oauth.authUrl}?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&state=${encodedState}&scope=${encodedScopes}`;
    }
    return null;
  };

  const handleInstall = async () => {
    const oauthUrl = getOauthUrl(integration);

    if (oauthUrl) {
      window.open(oauthUrl);
    } else if (integration.settings.some((setting) => setting.required)) {
      navigate(path.to.integration(integration.id));
    } else if (integration.onInitialize) {
      await integration.onInitialize?.();
    } else {
      const formData = new FormData();
      fetcher.submit(formData, {
        method: "post",
        action: path.to.integration(integration.id)
      });
    }
  };

  const handleUninstall = async () => {
    await integration?.onUninstall?.();
  };

  return (
    <Card>
      <div className="pt-6 px-6 h-16 flex items-center justify-between gap-6">
        <integration.logo className="h-10 w-auto" />
        {integration.active ? (
          installed ? (
            <Badge className="flex-shrink-0" variant="green">
              Installed
            </Badge>
          ) : null
        ) : (
          <Badge className="flex-shrink-0" variant="secondary">
            Coming soon
          </Badge>
        )}
      </div>
      <CardHeader className="pb-0">
        <div className="flex items-center space-x-2 pb-4">
          <CardTitle className="text-md font-medium leading-none p-0 m-0">
            {integration.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground pb-4">
        {integration.description}
      </CardContent>
      <CardFooter className="flex flex-end flex-row-reverse gap-2">
        <Button isDisabled={!installed} variant="secondary" asChild>
          <Link to={integration.active && installed ? integration.id : "#"}>
            Details
          </Link>
        </Button>
        {installed ? (
          <fetcher.Form
            method="post"
            action={path.to.integrationDeactivate(integration.id)}
            onSubmit={handleUninstall}
          >
            <Button
              variant="destructive"
              type="submit"
              isDisabled={fetcher.state !== "idle"}
              isLoading={fetcher.state !== "idle"}
            >
              Uninstall
            </Button>
          </fetcher.Form>
        ) : (
          <Button
            isDisabled={!integration.active || fetcher.state !== "idle"}
            isLoading={fetcher.state !== "idle"}
            onClick={handleInstall}
          >
            Install
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
