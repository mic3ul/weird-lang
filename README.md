# WEIRD Programming Language

WEIRD is a C-based scripting language and bytecode runtime intended for command-line tools, automation, and application logic. This repository is the language project, separate from the unrelated security-testing project that also uses the WEIRD name.

**Baseline:** 0.6.0 source package. See the roadmap before treating planned features as implemented.

## Goals

- A reliable, portable scripting runtime with clear errors and repeatable tests.
- Practical filesystem, process, JSON, time, and networking APIs.
- A package ecosystem through [weird-packages](https://github.com/mic3ul/weird-packages).
- Bot logic written in WEIRD, with messaging transports isolated behind a documented adapter.
- A prototype external-library bridge for trusted Node.js packages, with JSON-only inputs and outputs.
- Safe, testable group administration and media workflows where the selected messaging integration permits them.

## Build and run

**Repository limitation:** the complete WEIRD 0.6.0 C source tree has not yet been committed here, so the commands below cannot currently build this checkout. They describe the expected workflow once `src/`, `Makefile`, and the runtime tests have been restored. The baseline source archive was tested separately; those results do not mean this GitHub checkout builds.

Requirements: a C compiler (GCC or Clang), make, a POSIX-compatible C library, libm, and Python 3. libcurl development files are optional for HTTP(S).

```sh
make
./build/weird run examples/hello.wrd
./build/weird check examples/hello.wrd
./build/weird version
make test
```

The baseline supports a bytecode VM, lists/maps, functions, imports, exceptions, filesystem/process/args/JSON/time modules, DNS/TCP, optional libcurl HTTP(S), and the WPM package manager. See `docs/` for the exact verified behavior.

## External libraries

See [examples/external-libraries](examples/external-libraries/README.md) for an experimental adapter that invokes allowlisted Node.js package exports through a subprocess. It supports JSON-compatible calls, not in-process FFI, persistent JavaScript objects, callbacks, or binary streams. Allowed packages run with the current user's OS permissions; the allowlist is not a sandbox.

## Bot examples

- [WhatsApp bot prototype](examples/whatsapp-bot/README.md): WEIRD command logic with a separate Baileys adapter.
- [Telegram YouTube bot prototype](examples/telegram-youtube-bot/README.md): WEIRD command routing with grammY and yt-dlp-exec for metadata and permitted downloads.

These are prototypes. The adapters have not been verified against live accounts in this environment. Keep tokens and session state out of Git. Review platform rules, dependency security, copyright, and file-size limits before use.

## Project status

The language baseline and bot integrations are not the same thing. Planned features are tracked in [the development roadmap](docs/DEVELOPMENT_ROADMAP.md) and [the bot architecture](docs/WHATSAPP_BOT_ARCHITECTURE.md). GitHub Actions checks adapter syntax and external-bridge safety tests only; it does not compile WEIRD or run the full runtime test suite. Features are considered complete only after implementation, tests, and documentation are present.

## Related project

- Package registry: https://github.com/mic3ul/weird-packages
