import { FormEvent, useEffect, useState } from "react";
import { Button, Modal, Select, Stack, TextInput, VerticalButtonGroup } from "~/components";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

interface OpenSplitTimeAuthResult {
  expiration: string;
  credentialsSaved: boolean;
}

interface OpenSplitTimeSavedCredentials {
  email: string;
  available: boolean;
}

interface OpenSplitTimeAuthStatus {
  authenticated: boolean;
  expiration: string | null;
}

type OpenSplitTimeEnvironment = "production" | "staging";

interface OpenSplitTimeEnvironmentOption {
  environment: OpenSplitTimeEnvironment;
  name: string;
}

interface OpenSplitTimeEnvironmentsResult {
  environments: OpenSplitTimeEnvironmentOption[];
  current: OpenSplitTimeEnvironment;
}

interface OpenSplitTimeLoginProps {
  className?: string;
}

export function OpenSplitTimeLogin({ className }: OpenSplitTimeLoginProps = {}) {
  const ipcRenderer = useIpcRenderer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [environmentOptions, setEnvironmentOptions] = useState<OpenSplitTimeEnvironmentOption[]>(
    []
  );
  const [environment, setEnvironment] = useState<OpenSplitTimeEnvironment | null>(null);
  const [pendingEnvironment, setPendingEnvironment] = useState<OpenSplitTimeEnvironment | null>(
    null
  );
  const [pushPaused, setPushPaused] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let isMounted = true;

    ipcRenderer
      .invoke("opensplittime-get-saved-credentials")
      .then((result) => {
        if (!isMounted) return;

        const savedCredentials = result as OpenSplitTimeSavedCredentials;
        setEmail(savedCredentials.email);
        setHasSavedCredentials(savedCredentials.available);
        setSaveCredentials(savedCredentials.available);
      })
      .catch(() => undefined);

    ipcRenderer
      .invoke("opensplittime-get-auth-status")
      .then((result) => {
        if (!isMounted) return;

        const authStatus = result as OpenSplitTimeAuthStatus;
        if (authStatus.authenticated) setExpiration(authStatus.expiration);
      })
      .catch(() => undefined);

    ipcRenderer
      .invoke("opensplittime-get-environments")
      .then((result) => {
        if (!isMounted) return;

        const environmentsResult = result as OpenSplitTimeEnvironmentsResult;
        setEnvironmentOptions(environmentsResult.environments);
        setEnvironment(environmentsResult.current);
      })
      .catch(() => undefined);

    ipcRenderer
      .invoke("opensplittime-get-push-paused")
      .then((result) => {
        if (!isMounted) return;

        setPushPaused((result as { paused: boolean }).paused);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [ipcRenderer]);

  // A push failure can clear the token in the main process at any time (e.g. expiration), so poll
  // for that instead of only checking auth status once on mount.
  useEffect(() => {
    if (!expiration) return;

    const interval = setInterval(() => {
      ipcRenderer
        .invoke("opensplittime-get-auth-status")
        .then((result) => {
          const authStatus = result as OpenSplitTimeAuthStatus;
          if (!authStatus.authenticated) {
            setSessionExpired(true);
            setExpiration(null);
          }
        })
        .catch(() => undefined);
    }, 20_000);

    return () => clearInterval(interval);
  }, [ipcRenderer, expiration]);

  const applyEnvironment = async (nextEnvironment: OpenSplitTimeEnvironment) => {
    await ipcRenderer.invoke("opensplittime-set-environment", { environment: nextEnvironment });
    setEnvironment(nextEnvironment);
  };

  const handleEnvironmentChange = (value: string | null) => {
    if (!value || value === environment) return;

    const nextEnvironment = value as OpenSplitTimeEnvironment;
    if (environment === "staging" && nextEnvironment === "production") {
      setPendingEnvironment(nextEnvironment);
      return;
    }

    void applyEnvironment(nextEnvironment);
  };

  const handleConfirmProduction = () => {
    if (!pendingEnvironment) return;

    void applyEnvironment(pendingEnvironment);
    setPendingEnvironment(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(false);
    setIsSubmitting(true);

    try {
      const result = (await ipcRenderer.invoke("opensplittime-authenticate", {
        email,
        password,
        saveCredentials
      })) as OpenSplitTimeAuthResult;
      setExpiration(result.expiration);
      setHasSavedCredentials(result.credentialsSaved);
      setPushPaused(false);
      setSessionExpired(false);
      setPassword("");
    } catch {
      setExpiration(null);
      setError(true);
    } finally {
      setPassword("");
      setIsSubmitting(false);
    }
  };

  const handleSavedLogin = async () => {
    setError(false);
    setIsSubmitting(true);

    try {
      const result = (await ipcRenderer.invoke(
        "opensplittime-authenticate-saved"
      )) as OpenSplitTimeAuthResult;
      setExpiration(result.expiration);
      setPushPaused(false);
      setSessionExpired(false);
    } catch {
      setExpiration(null);
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await ipcRenderer.invoke("opensplittime-clear-authentication");
    setExpiration(null);
    setPassword("");
    setPushPaused(true);
    setSessionExpired(false);
  };

  const handleTogglePush = async () => {
    if (!expiration) return;

    const nextPaused = !pushPaused;
    await ipcRenderer.invoke("opensplittime-set-push-paused", { paused: nextPaused });
    setPushPaused(nextPaused);
  };

  return (
    <VerticalButtonGroup label="OpenSplitTime Steward Login" className={className}>
      {expiration ? (
        <Stack direction="col" className="gap-2">
          {environmentOptions.length > 0 && (
            <Select
              label="OST Environment"
              value={environment}
              onChange={() => undefined}
              disabled
              options={environmentOptions.map((option) => ({
                name: `${option.name} - ${option.environment}`,
                value: option.environment
              }))}
            />
          )}
          <span className="text-sm font-medium text-on-component">
            Connected until {new Date(expiration).toLocaleString()}
          </span>
          <Button type="button" size="wide" onClick={handleLogout}>
            Sign Out
          </Button>
          <span className="text-sm font-medium text-on-component">
            Pushes to OpenSplitTime are {pushPaused ? "paused" : "active"}.
          </span>
          <Button type="button" size="wide" onClick={handleTogglePush} disabled={!expiration}>
            {pushPaused ? "Resume Pushes" : "Pause Pushes"}
          </Button>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {sessionExpired && (
            <span className="text-sm font-medium text-danger">
              Your OpenSplitTime session has expired. Please sign in again.
            </span>
          )}
          {environmentOptions.length > 0 && (
            <Select
              label="OST Environment"
              value={environment}
              onChange={handleEnvironmentChange}
              options={environmentOptions.map((option) => ({
                name: `${option.name} - ${option.environment}`,
                value: option.environment
              }))}
            />
          )}
          <TextInput
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div className="flex items-center gap-2 text-sm font-medium text-on-component">
            <input
              type="checkbox"
              aria-label="Save credentials"
              checked={saveCredentials}
              onChange={(event) => setSaveCredentials(event.target.checked)}
            />
            <span>Save credentials</span>
          </div>
          {error && <span className="text-sm font-medium text-danger">Sign-in failed.</span>}
          <Button type="submit" size="wide" disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>
          {hasSavedCredentials && (
            <Button type="button" size="wide" onClick={handleSavedLogin} disabled={isSubmitting}>
              Sign In with Saved Credentials
            </Button>
          )}
        </form>
      )}
      <Modal
        title="Live Event"
        open={pendingEnvironment !== null}
        setOpen={(open) => !open && setPendingEnvironment(null)}
        showNegativeButton
        negativeText="Cancel"
        affirmativeText="Continue"
        onAffirmative={handleConfirmProduction}
        dangerous
      >
        <p className="text-center">
          You are switching to the <strong>production</strong> OpenSplitTime environment. Any times
          you submit will post to the live event.
        </p>
      </Modal>
    </VerticalButtonGroup>
  );
}
