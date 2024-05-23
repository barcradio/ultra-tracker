export function Versions(): JSX.Element {
  const versions = window.electron.process.versions;
  const versionClasses = "block leading-4 opacity-80 px-2.5";

  return (
    <ul className="absolute bottom-10 inline-flex font-mono leading-4 px-2.5 py-4 bg-zinc-800 overflow-hidden items-center background-blur-xl rounded-xl">
      <li className={versionClasses}>Electron v{versions.electron}</li>
      <li className={versionClasses}>Chromium v{versions.chrome}</li>
      <li className={versionClasses}>Node v{versions.node}</li>
    </ul>
  );
}
