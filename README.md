# Buchanan Solutions TypeScript LogKit Monorepo

A **pnpm monorepo** containing the core logging SDK and future framework-specific extensions.

---

## Table of Contents

- [Monorepo Overview](#-monorepo-overview)
  - [Independent Package Philosophy](#-independent-package-philosophy)
- [Available Packages](#-available-packages)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Workflow](#development-workflow)
- [Publishing & Distribution](#-publishing--distribution)
- [Repository Structure](#-repository-structure)
- [Development Guidelines](#-development-guidelines)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📦 Monorepo Overview

This repository uses [pnpm workspaces](https://pnpm.io/workspaces) to manage multiple packages efficiently:

```
ts-logkit/
├── packages/
│   └── ts-logkit/          # Core, framework-agnostic logging SDK
├── package.json           # Workspace root configuration
└── pnpm-lock.yaml         # Dependency lock file
```

### 🎯 Independent Package Philosophy

Each package in this monorepo is designed to be:

- **Self-contained** - No cross-dependencies between packages
- **Independently versioned** - Each package has its own semantic versioning
- **Separately published** - Packages are published to GitHub Package Registry independently
- **Focused** - Each package solves a specific problem domain

---

## 📚 Available Packages

### [`@buchanan-solutions/ts-logkit`](packages/ts-logkit/)

**Core, framework-agnostic logging SDK**

A minimal, typed logging core built around explicit concepts: Loggers, Events, Formatters, Transports, and Hooks.

**Key Features:**

- 📝 Structured logger instances with explicit identity
- 📊 Rich log levels (trace, debug, info, warn, error, fatal)
- 🚚 Pluggable transports (console, file, network, telemetry)
- 🎨 Formatter layer (ANSI dev formatter, browser formatter)
- 🪝 Hook system for side effects (metrics, analytics, error reporting)
- 🌍 Environment-safe (Node.js, Browser, SSR, Edge runtimes)

See the [package README](packages/ts-logkit/README.md) for detailed documentation.

### _(planned)_ `@buchanan-solutions/ts-logkit-next`

Next.js adapter (App Router–aware)

### _(planned)_ `@buchanan-solutions/ts-logkit-react`

React helpers & context

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm/yarn
- Git

### Installation

Clone the repository:

```bash
git clone <repository-url>
cd ts-logkit
```

Install dependencies:

```bash
pnpm install
```

### Development Workflow

Run tests for all packages:

```bash
pnpm test
```

Run tests for a specific package:

```bash
pnpm --filter @buchanan-solutions/ts-logkit test
```

Build all packages:

```bash
pnpm build
```

Build a specific package:

```bash
pnpm --filter @buchanan-solutions/ts-logkit build
```

Watch for changes and rebuild:

```bash
pnpm watch
```

---

## 📦 Publishing & Distribution

Packages are published to **GitHub Package Registry**:

- 🌐 Fully public
- 🔢 Semantic versioning
- 📦 Independent package versions per workspace

This allows:

- 🎯 Controlled releases
- 🔐 Fine-grained access
- 🧩 Clean separation between core and adapters

### Publishing Workflow

Each package is published independently. The process typically involves:

1. Update version in the package's `package.json`
2. Update `CHANGELOG.md` with changes
3. Commit changes
4. Create and push a version tag
5. Monitor CI/CD for successful publication

See individual package documentation for specific publishing instructions.

---

## 📁 Repository Structure

```
ts-logkit/
├── packages/
│   └── ts-logkit/          # Core logging package
│       ├── src/            # Source code
│       ├── tests/          # Unit tests
│       ├── dist/           # Built output (gitignored)
│       ├── README.md       # Package documentation
│       ├── package.json    # Package configuration
│       └── tsconfig.json   # TypeScript configuration
├── package.json            # Workspace root configuration
├── pnpm-lock.yaml          # Dependency lock file
└── README.md               # This file
```

---

## 🔧 Development Guidelines

### Adding a New Package

1. Create package directory: `packages/your-package-name/`
2. Add `package.json` with proper configuration
3. Set up TypeScript configuration
4. Add tests with Vitest
5. Create comprehensive README
6. Add development documentation

### Package Structure Standards

Each package should follow this structure:

```
packages/your-package/
├── src/                 # Source code
├── tests/              # Unit tests
├── dist/               # Built output (gitignored)
├── README.md           # Package documentation
├── package.json        # Package configuration
├── tsconfig.json       # TypeScript configuration
└── vitest.config.ts    # Test configuration
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **Testing**: Comprehensive unit test coverage
- **Linting**: ESLint configuration
- **Documentation**: README and API documentation
- **CI/CD**: Automated testing and publishing

---

## 🤝 Contributing

Contributions are welcome, especially for:

- 🔌 Additional transports
- 🔗 Framework adapters
- 📝 Documentation improvements
- 💡 Real-world usage examples

Basic workflow:

1. Fork the repository
2. Install with `pnpm install`
3. Make changes
4. Ensure tests pass: `pnpm test`
5. Update documentation if needed
6. Open a PR with a clear description

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
