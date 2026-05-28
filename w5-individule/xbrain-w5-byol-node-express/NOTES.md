# Strategy Choice: A — `serverless-http`

## Why this option?

1. **Minimal code change** — Only 1 new file (`lambda.js`) with 3 lines of logic. Zero changes to `app.js`.
2. **Clean separation** — The adapter wraps the Express app at the Lambda boundary only. The framework code stays pure and can still run locally with `node server.js`.
3. **Mature & well-maintained** — `serverless-http` is the most popular adapter with 1M+ weekly downloads, supports API Gateway HTTP API (payload format 2.0) out of the box.
4. **Low cold start** — Adds ~200-400ms init duration. No extra Lambda Layer overhead.

## Alternatives considered

| Strategy | Why not chosen |
|----------|---------------|
| B — `@vendia/serverless-express` | Functionally equivalent to A but larger dependency tree, less actively maintained since Vendia sunset. |
| C — AWS Lambda Web Adapter | Zero JS changes is appealing, but adds Layer dependency and ~200ms extra cold start on top of the app startup. Better for containers or non-Node runtimes. |
| D — Roll your own | Educational but impractical (~30-80 lines), error-prone path parsing, no benefit over proven adapters. |

## Implementation summary

```
lambda.js  →  require('serverless-http')(app)  →  exports.handler
template.yaml  →  Handler: lambda.handler
package.json  →  added "serverless-http": "^3.2.0"
```

## Cold start measurement

- Init Duration: **336 ms**
- Billed Duration: 423 ms
- Runtime Duration: 86 ms
- Memory Used: 93 MB / 512 MB

## Live URL

https://j4l5hhkzj2.execute-api.us-west-2.amazonaws.com
