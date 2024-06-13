# ultra-tracker

An Electron application with React and TypeScript for tracking athlete times in
ultra marathons.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) +
[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) +
[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) +
[Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### Configure development environment

1. This project uses `pnpm` as the package manager. It is a much faster version of
`npm` and is a drop-in replacement.

To install, go to the [pnpm website](https://pnpm.io/installation) and follow
the instructions.
```bash
  # For Windows
  iwr https://get.pnpm.io/install.ps1 -useb | iex
```
2. Install Project Dependencies
```bash
$ pnpm install
```
3. Clone repository 

4. Open folder in VSCode and install recommended extensions



### Local Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

### Linting

```bash
# View lint errors
$ pnpm lint
```

```bash
# View lint errors and automatically fix when possible
$ pnpm lint:fix
```

## Troubleshooting
