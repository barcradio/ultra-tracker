# ultra-tracker

An Electron application with React and TypeScript for tracking athlete times in
ultra marathons.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) +
[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) +
[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) +
[Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### Configure development environment

1. Install pnpm

   pnpm is the package manager utilized. It is a drop-in replacement for 'npm'. [pnpm website](https://pnpm.io/installation). 
   ```bash
     # For Windows from the powershell
     iwr https://get.pnpm.io/install.ps1 -useb | iex
   ``` 

3. Install winget (windows only)

   winget is the Microsoft CLI installer [winget website](https://learn.microsoft.com/en-us/windows/package-manager/winget/)
    ```bash 
      # For Windows from the powershell
      Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe
   ``` 

5. Install git [git app website](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
   ```bash 
     # For Windows from the powershell
     winget install --id Git.Git -e --source winget
   ``` 

3. Clone repository
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

8. To run a development version of ultra-tracker, ie. to interact completely with the app. (not to package for distribution)
   ```bash
     # For Windows, Linux or MacOS 
     pnpm dev
   ```

9. Open folder in VSCode and install recommended extensions


### Project structure

In Electron, the structure of the application is emulated the src directory.  Content in `/main` is the backend, content in `/preload` is a small amount of middleware, and content in `/renderer` is the client frontend.

Take care to think of where implementation should be.  Implementation on the frontend client that ought to be at the backend server can cause synchronization issues and refactor later.

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


### Local Development
To compile and run the application use the following command in the terminal. 

```bash
$ pnpm dev
```
The VSCode launch settings are configured in the project to run the app.  It runs with a debugger attached by default, buit can also be run without using the launch controls.

### Build
To build a complete installer for a given environment, use these commands.

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```


### Linting
Linting is the process of running a program that will analyse code for potential errors. The term was derived from the name of the undesirable bits of fiber and fluff.
```bash
# View lint errors
$ pnpm lint
```

```bash
# View lint errors and automatically fix when possible
$ pnpm lint:fix
```

## Troubleshooting

### Issues with better-sqlite-3 functions after restructure of folders
If the folder thus import structure changes, better-sqlite3 seems to have things that need to be rebuilt.

1. Ensure that all code compilation errors are resolved.
2. Run `pnpm rebuild`.
3. Compile and run.
