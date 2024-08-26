import { useEffect, useRef } from "react";

function createPortalRoot() {
  const portalRoot = document.createElement("div");
  portalRoot.setAttribute("id", "portal-root");
  document.body.appendChild(portalRoot);
  return portalRoot;
}

export function usePortalRoot() {
  const bodyRef = useRef(document.querySelector("body"));
  const existingPortalRoot = document.getElementById("portal-root");
  const portalRootRef = useRef(existingPortalRoot || createPortalRoot());

  useEffect(() => {
    const body = bodyRef.current;
    return () => body?.removeAttribute("style");
  }, []);

  return portalRootRef;
}
