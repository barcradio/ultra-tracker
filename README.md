![image](https://github.com/user-attachments/assets/f1d4e7a5-e90b-471c-9137-1f1022d9e1f9)

![image](https://github.com/user-attachments/assets/9c6c85dd-449e-43e5-8b92-d58258e8f2dc)


An app for tracking athletes during ultra marathons (Windows, Linux, MacOS)

An Electron application with React and TypeScript.

### Configure development environment

1. Install pnpm

   pnpm is used as the package manager. It is a drop-in replacement for 'npm'.

   [pnpm website](https://pnpm.io/installation) 
   ```bash
     # For Windows from the powershell
     iwr https://get.pnpm.io/install.ps1 -useb | iex
   ``` 

2. Install winget (windows only)

   winget is the Microsoft CLI installer

   [winget website](https://learn.microsoft.com/en-us/windows/package-manager/winget/)
    ```bash 
      # For Windows from the powershell
      Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe
   ``` 

3. Install git
   
   This is a third party product, not from the Github website

   [git app website](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
   ```bash 
     # For Windows from the powershell
     winget install --id Git.Git -e --source winget
   ``` 
   ```bash 
     # For Linux Ubuntu cli
     sudo apt install git
   ```
   
4. Clone repository
   ```bash
     # For Windows, Linux or MacOS 
     git clone https://github.com/barcradio/ultra-tracker
   ```

5. Change dir to the new folder (ultra-tracker) that was created in the previous step
   ```bash
     # For Windows, Linux or MacOS 
     cd ultra-tracker
   ```  

6. Install any missing project dependencies
   ```bash
     # For Windows, Linux or MacOS 
     pnpm install
   ```

7. Rebuild imported packages
   ```bash
     # For Windows, Linux or MacOS 
     pnpm rebuild
   ```

8. To run a development version of the ultra-tracker app. (This is also called compiling, this is not a build, see Build below)
   ```bash
     # For Windows, Linux or MacOS 
     pnpm dev
   ```

9. To retrieve the latest changes to your ultra-tracker repository's cloned (remote) version. (Your database and config files will not be changed)
    ```bash
      # For Windows, Linux or MacOS 
      # git pull
      # Repeat steps 6 through 7 before running before continuing or performing builds (below)
   ```

10. To assist in editing code, logic, or UI, the repository folder can easily be opened with VSCode and the recommended extensions will be installed.

    The VSCode launch settings are configured in the repository to run the app.  It runs with a debugger attached by default, but can also be run without, using the launch controls.

    [VSCode website](https://code.visualstudio.com/)

### Recommended VSCode IDE Setup

[VSCode](https://code.visualstudio.com/) +
[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) +
[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) +
[Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### Project structure

In Electron, the app structure is emulated in the src directory.  Content in `/main` is the backend, content in `/preload` is a small amount of middleware, and content in `/renderer` is the client frontend.

Consider carefully where the implementation should be located. The implementation on the frontend client that should be at the backend server and can cause synchronization issues and refactoring in the future.

The `/shared` directory holds common types and global data.  This is not an alternative for passing data via IPC.

```
  ├───api                             // future server-api
  ├───main            // backend
  │   ├───database                    // only db access
  │   ├───ipc                         // ipc to frontend
  │   └───lib
  ├───preload         // middleware
  ├───renderer        // frontend
  │   └───src
  │       ├───assets
  │       ├───components
  │       ├───features
  │       │   ├───Footer
  │       │   ├───Header
  │       │   ├───SettingsHub
  │       │   └───Toasts
  │       ├───hooks
  │       ├───lib
  │       └───routes
  └───shared                           // common data/types
```

### Build
To build a complete installer for a given environment, use these commands.

```bash
  # For windows
  pnpm build:win

  # For macOS
  pnpm build:mac

  # For Linux
  pnpm build:linux
```
### Install 
Run the single file executable to install.

```bash 
  # For Windows UI
  Double-click the new file created in the previous step
``` 

### Linting
Linting is the process of running a program that will analyze code for potential errors. The term was derived from the name of the undesirable bits of fiber and fluff.
```bash
  # View lint errors
  pnpm lint
```

```bash
  # View lint errors and automatically fix when possible
  pnpm lint:fix
```

## Troubleshooting

### Issues with better-sqlite-3 functions after the restructure of folders
If the folder structure changes, better-sqlite3 likes to have things rebuilt.

1. Ensure that all code compilation errors are resolved.
2. Run `pnpm rebuild` before compiling or building


