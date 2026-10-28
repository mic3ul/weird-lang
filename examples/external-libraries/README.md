# External Node.js libraries from WEIRD

This experimental adapter lets a WEIRD script call an exported function from an installed Node.js package using JSON-compatible arguments and results. It is a subprocess bridge, not native Node.js interoperability and not an in-process FFI.

## Requirements

- A built WEIRD 0.6.0 runtime.
- Node.js 20 or newer and npm.
- Only trusted packages installed locally.

## Try it

From this directory:

```sh
npm install
npm test
npm run check
export WEIRD_EXTERNAL_BRIDGE="$PWD/bridge.mjs"
export WEIRD_EXTERNAL_ALLOWLIST="lodash"
../../build/weird run example.wrd
```

Expected output:

```text
[[1,2],[3,4],[5]]
```

## Calling a package

```weird
import "external.wrd"
let chunks = external.call("lodash", "chunk", [[1, 2, 3, 4, 5], 2])
print(json.stringify(chunks))
```

The third argument is a list passed positionally to the selected exported function. Use `"default"` for a package's default export. Dotted export paths are supported, but prototype-related keys are rejected. Arguments and results must be JSON-serializable.

## Security and limitations

- Every package must be named exactly in `WEIRD_EXTERNAL_ALLOWLIST`; the default is deny-all.
- The allowlist is not a sandbox. An allowed package executes with the operating system permissions of the current user. Install only packages you trust.
- The bridge has a 1 MiB request limit and the WEIRD wrapper sets a 30-second process timeout and 1 MiB output cap.
- Calls start a new Node.js process each time; this is simple but has startup overhead and does not preserve JavaScript objects or state between calls.
- This does not support callbacks, streaming/binary results, live object handles, or asynchronous event subscriptions.
- Do not pass secrets or untrusted data to packages without reviewing their behavior.
- The WEIRD C source tree is not yet restored to this GitHub checkout, so the WEIRD example cannot run from this checkout until the runtime source is committed and built.
