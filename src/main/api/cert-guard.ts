// MAIN process
import { session } from "electron";

// A per-session mutable allowlist + optional fingerprint pinning
const allowedHosts = new Set<string>();
const pinnedByHost = new Map<string, string>(); // host -> fingerprint256

export function installCertGate() {
  // Call once (e.g., on app ready), before any requests on this session
  session.defaultSession.setCertificateVerifyProc((req, cb) => {
    const { hostname, certificate } = req;

    if (!allowedHosts.has(hostname)) {
      return cb(-2); // deny if not explicitly allowed
    }

    const pinned = pinnedByHost.get(hostname);
    if (pinned && certificate?.fingerprint !== pinned) {
      return cb(-2); // deny if pin doesn't match
    }

    return cb(0); // allow
  });
}

export function allowHost(host: string, fingerprint256?: string) {
  allowedHosts.add(host);
  if (fingerprint256) pinnedByHost.set(host, fingerprint256);
}

export function disallowHost(host: string) {
  allowedHosts.delete(host);
  pinnedByHost.delete(host);
}
