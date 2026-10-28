# WEIRD Programming Language

WEIRD is a C-based scripting language and bytecode runtime intended for command-line tools, automation, and application logic. This repository is the language project, separate from the unrelated security-testing project that also uses the WEIRD name.

**Baseline:** 0.6.0 source package. See the roadmap before treating planned features as implemented.

## Goals

- A reliable, portable scripting runtime with clear errors and repeatable tests.
- Practical filesystem, process, JSON, time, and networking APIs.
- A package ecosystem through [weird-packages](https://github.com/mic3ul/weird-packages).
- Bot logic written in WEIRD, with messaging transports isolated behind a documented adapter.
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

## WhatsApp bot direction

The target is a maintainable bot whose commands and business rules live in WEIRD. A separate transport adapter may be required for WhatsApp events and media. The adapter is not part of the language runtime and must not be described as native functionality until implemented and tested.

- Use the official WhatsApp Business Platform when its documented capabilities fit the use case.
- If evaluating a WhatsApp Web-compatible community library, document its account/session risks, terms, hosting needs, and actual group-management capabilities.
- Never commit credentials, session databases, or personal chat data.
- Restrict moderation commands to authorized administrators; validate every target and log destructive actions.

## Project status

The language baseline and proposed bot integration are not the same thing. Planned features are tracked in [the development roadmap](docs/DEVELOPMENT_ROADMAP.md) and [the bot architecture](docs/WHATSAPP_BOT_ARCHITECTURE.md). At present, GitHub Actions checks the WhatsApp bridge JavaScript syntax and package metadata only; it does not compile WEIRD or run the runtime integration tests. Features are considered complete only after implementation, tests, and documentation are present.

## Related project

- Package registry: https://github.com/mic3ul/weird-packages
