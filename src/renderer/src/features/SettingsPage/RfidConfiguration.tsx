import { useEffect, useRef, useState } from "react";
import { Button, Modal, Select, Stack, TextInput, VerticalButtonGroup } from "~/components";
import { useToasts } from "~/features/Toasts/useToasts";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { DeviceStatus } from "$shared/enums";
import { type RfidConnectionSettings } from "$shared/models";
import { useRFIDStatus } from "./hooks/useRFIDStatus";

const zebraFxr90Type = "zebra-fxr90";

type RfidConnectionProfile = Partial<
  Pick<
    RfidConnectionSettings,
    "type" | "restApiUrl" | "webSocketUrl" | "userName" | "password" | "sslCert"
  >
>;

export function RfidConfiguration() {
  const { createToast } = useToasts();
  const ipcRenderer = useIpcRenderer();
  const [rfidStatus] = useRFIDStatus();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [readerType, setReaderType] = useState(zebraFxr90Type);
  const [host, setHost] = useState("");
  const [certSerial, setCertSerial] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isChangingScanState, setIsChangingScanState] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const authenticated = rfidStatus === DeviceStatus.Connected;

  useEffect(() => {
    const refreshScanState = async () => {
      setIsScanning(await ipcRenderer.invoke("rfid-is-scanning"));
    };

    void refreshScanState();
    const statusPoll = setInterval(() => void refreshScanState(), 1000);
    return () => clearInterval(statusPoll);
  }, [ipcRenderer]);

  const importConnectionProfile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const profile = JSON.parse(await file.text()) as RfidConnectionProfile;
      if (profile.type !== zebraFxr90Type || !profile.restApiUrl || !profile.sslCert) {
        throw new Error(
          "Profile must contain a Zebra FXR90 type, hostname or IP, and certificate serial."
        );
      }

      setReaderType(profile.type);
      setHost(profile.restApiUrl);
      setCertSerial(profile.sslCert);
      setUsername(profile.userName ?? "");
      setPassword(profile.password ?? "");
      createToast({ message: "RFID connection profile loaded", type: "success" });
    } catch (error) {
      createToast({
        message: `Unable to load RFID connection profile: ${error instanceof Error ? error.message : String(error)}`,
        type: "danger",
        timeoutMs: -1
      });
    } finally {
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
  };

  const authenticate = async () => {
    const settings: RfidConnectionSettings = {
      type: readerType,
      restApiUrl: host,
      webSocketUrl: host,
      userName: username,
      password,
      sslCert: certSerial
    };

    setIsAuthenticating(true);
    try {
      const result = await ipcRenderer.invoke("rfid-initialize", settings);
      if (result !== "RFID authenticated") {
        createToast({ message: result, type: "danger", timeoutMs: -1 });
        return;
      }

      setPassword("");
      setSetupOpen(false);
      createToast({ message: result, type: "success" });
    } catch (error) {
      createToast({
        message: `RFID setup failed: ${error instanceof Error ? error.message : String(error)}`,
        type: "danger",
        timeoutMs: -1
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const toggleScan = async () => {
    setIsChangingScanState(true);
    try {
      const channel = isScanning ? "rfid-stop-reading" : "rfid-start-reading";
      const result = await ipcRenderer.invoke(channel);
      const scanning = await ipcRenderer.invoke("rfid-is-scanning");
      setIsScanning(scanning);
      createToast({ message: result, type: scanning ? "success" : "info" });
    } catch (error) {
      createToast({
        message: `RFID scan command failed: ${error instanceof Error ? error.message : String(error)}`,
        type: "danger",
        timeoutMs: -1
      });
    } finally {
      setIsChangingScanState(false);
    }
  };

  const disconnect = async () => {
    setIsDisconnecting(true);
    try {
      const result = await ipcRenderer.invoke("rfid-disconnect");
      setIsScanning(false);
      createToast({ message: result, type: "info" });
    } catch (error) {
      createToast({
        message: `RFID disconnect failed: ${error instanceof Error ? error.message : String(error)}`,
        type: "danger",
        timeoutMs: -1
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <VerticalButtonGroup
        label={
          <Stack direction="col">
            <span className="font-medium">RFID Configuration</span>
            <span className="text-xs font-medium">Reader Controls</span>
          </Stack>
        }
      >
        <Select
          label="Reader Type"
          value={readerType}
          onChange={(value) => setReaderType(value ?? zebraFxr90Type)}
          options={[{ name: "Zebra FXR90", value: zebraFxr90Type }]}
          disabled={authenticated}
        />
        <Button size="wide" onClick={() => setSetupOpen(true)} disabled={authenticated}>
          Setup
        </Button>
        <Button size="wide" onClick={toggleScan} disabled={!authenticated || isChangingScanState}>
          {isScanning ? "Stop Scan" : "Start Scan"}
        </Button>
        <Button
          size="wide"
          variant="outlined"
          onClick={disconnect}
          disabled={!authenticated || isDisconnecting}
        >
          {isDisconnecting ? "Disconnecting..." : "Disconnect RFID"}
        </Button>
      </VerticalButtonGroup>

      <Modal
        open={setupOpen}
        setOpen={setSetupOpen}
        title="Setup RFID Reader"
        size="sm"
        affirmativeText={isAuthenticating ? "Authenticating..." : "Authenticate"}
        affirmativeDisabled={
          isAuthenticating || !host.trim() || !certSerial.trim() || !username.trim() || !password
        }
        onAffirmative={() => void authenticate()}
      >
        <Stack direction="col" className="gap-4">
          <input
            ref={profileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importConnectionProfile(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outlined"
            size="wide"
            onClick={() => profileInputRef.current?.click()}
          >
            Load Connection Profile
          </Button>
          <TextInput
            label="Hostname or IP"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            autoComplete="off"
          />
          <TextInput
            label="Certificate Serial"
            value={certSerial}
            onChange={(event) => setCertSerial(event.target.value)}
            autoComplete="off"
          />
          <TextInput
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </Stack>
      </Modal>
    </>
  );
}
