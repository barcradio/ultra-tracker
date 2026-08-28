import { FormEvent, useEffect, useState } from "react";
import { Button, Stack, TextInput, VerticalButtonGroup } from "~/components";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

interface OpenSplitTimeAuthResult {
  expiration: string;
  credentialsSaved: boolean;
}

interface OpenSplitTimeSavedCredentials {
  email: string;
  available: boolean;
}

export function OpenSplitTimeLogin() {
  const ipcRenderer = useIpcRenderer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

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

    return () => {
      isMounted = false;
    };
  }, [ipcRenderer]);

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
  };

  return (
    <VerticalButtonGroup label="OpenSplitTime Steward Login">
      {expiration ? (
        <Stack direction="col" className="gap-2">
          <span className="text-sm font-medium text-on-component">
            Connected until {new Date(expiration).toLocaleString()}
          </span>
          <Button type="button" size="wide" onClick={handleLogout}>
            Sign Out
          </Button>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
            <span>Save credentials after successful sign-in</span>
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
    </VerticalButtonGroup>
  );
}
