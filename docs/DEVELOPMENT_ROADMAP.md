# WEIRD Development Roadmap

This is a plan, not a claim that the listed work already exists.

## Baseline: WEIRD 0.6.0

C implementation, lexer/parser/compiler, bytecode stack VM, garbage collector, core values and collections, functions, imports, exception handling, filesystem/process/args/JSON/time modules, DNS/TCP, optional libcurl HTTP(S), and WPM package management. Confirm each capability against source and tests before release.

## Phase 1 — Reproducible engineering

- Import the complete 0.6.0 source tree and preserve its history/release metadata where possible.
- Build on Linux and separately test Termux; do not infer Android support from Linux CI.
- Make the full test suite deterministic and split long suites into diagnosable jobs.
- Add regression tests for every confirmed bug; run sanitizer and GC-stress jobs.
- Document resource limits, filesystem behavior, subprocess behavior, and network failure modes.

## Phase 2 — Runtime ergonomics

- Improve stack traces, source locations, error categories, and structured logging.
- Standardize configuration and environment-variable access.
- Add a documented command-line argument parser and predictable exit codes.
- Add persistent storage through a maintained SQLite binding or justified alternative.
- Add safe media metadata helpers only with explicit size/type limits and maintained dependencies.

## Phase 3 — Bot-ready runtime

- Define a stable event/callback contract and lifecycle for external adapters.
- Add timers, cancellation, bounded queues, timeouts, retry/backoff, and clean shutdown.
- Design nonblocking I/O before claiming async behavior.
- Add tests for reconnects, duplicate events, rate limits, and resource cleanup.
- Keep transport-specific APIs behind a module or adapter so the core language remains independent.

## Phase 4 — WhatsApp bot adapter

- Choose the integration only after comparing official API capabilities with the required group features.
- Keep command parsing, permissions, configuration, and business rules in WEIRD.
- Use a small, separately managed Node.js bridge only if needed; document it as a dependency, not as native WEIRD support.
- Add command registry, aliases, argument validation, per-group settings, role checks, audit logs, and cooldowns.
- Add group actions only when the connected integration exposes them and the bot is an authorized admin.
- For media: enforce download size limits, content-type validation, timeouts, temporary-file cleanup, and safe path handling.
- Never store tokens or authenticated session files in the repository.

## Phase 5 — Packaging and release

- Publish packages as versioned GitHub Releases using the WPM registry format.
- Require a manifest, changelog, integrity metadata, docs, and clean-install tests.
- Add CI for build, tests, formatting/static checks, package integration, and supported platforms.
- Mark every platform and capability as tested, untested, or unsupported.

## Release gate

A phase is complete only when the implementation exists, tests pass, examples run, docs match behavior, and limitations are explicit.
