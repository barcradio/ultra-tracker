import { LinkProps, useMatchRoute } from "@tanstack/react-router";

export function useIsActiveRoute(to: LinkProps["to"]): boolean {
  const matchRoute = useMatchRoute();
  const params = matchRoute({ to });

  return Boolean(params);
}
