# Node.js + Express — BYOL starter (NOT YET SERVERLESS)

This is a plain Express app. It runs locally as a normal Node HTTP server.
**It does not run on Lambda yet.** Your group's job is to make it run on
Lambda with the **minimum** code/config changes.

```
node-express/
├── app.js              ← The existing Express application (Lambda-unaware — DO NOT REWRITE this for Lambda specifics)
├── server.js           ← Local dev runner: `npm start` → http://localhost:3000
├── package.json        ← Only `express` listed; add anything else you need
├── template.yaml       ← SAM scaffold — has TODO markers you must fill in
├── samconfig.toml      ← stack name + region (us-west-2) pre-set
└── README.md           ← this file
```

## Step 0 — Confirm the app works in its current "non-serverless" form

```bash
npm install
npm start
# → listening on http://localhost:3000

# in another terminal:
curl http://localhost:3000/
curl http://localhost:3000/api/hello/Lan
curl -X POST http://localhost:3000/api/echo -H 'Content-Type: application/json' -d '{"hi":"there"}'
```

If those three curls work, you have a baseline to compare against later.

## Step 1 — Pick your strategy

You have several ways to get this on Lambda. Pick **one** (others are
foot-notes for your reflection write-up):

| # | Strategy | What you add | Code-change cost | Cold start estimate |
|---|----------|--------------|------------------|---------------------|
| A | `serverless-http` adapter | 1 new file (`lambda.js`), 1 npm dep | ~3 lines | 200–400 ms |
| B | `@vendia/serverless-express` adapter | 1 new file, 1 npm dep | ~3 lines | 200–400 ms |
| C | **AWS Lambda Web Adapter** (Lambda Layer + `run.sh`) | 1 shell script, edit `template.yaml` | 0 JS lines | +200 ms over native |
| D | Roll your own | manual event → req → res translation | 30–80 lines | depends |

Document **why** you picked your option in `NOTES.md` (you'll need this for
the worksheet's Q4.1 + Q4.6).

## Step 2 — Implement

The repo intentionally leaves you these blanks:

- `template.yaml` — `Handler:` is `TODO_FILL_IN`. Replace with the correct
  value for your strategy.
- `package.json` — add your chosen adapter to `dependencies` (or skip if
  you use Lambda Web Adapter, which is a Layer not an npm package).
- *New file(s)* — usually one new entrypoint file. Don't touch `app.js`.

> **Hard rule:** `app.js` must NOT import anything from your adapter.
> The whole pedagogy is that the framework code stays clean.

## Step 3 — Build + deploy

```bash
sam build
sam deploy --guided          # first time only — uses pre-set us-west-2
# subsequent deploys:
sam deploy
```

Region MUST be `us-west-2` if you're on the workshop participant account.

## Step 4 — Smoke-test the live URL

```bash
export API=$(aws cloudformation describe-stacks \
  --stack-name byol-node-express --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)

curl $API
curl $API/api/hello/Lan
curl -X POST $API/api/echo -H 'Content-Type: application/json' -d '{"hi":"there"}'
```

All three should return the same JSON shape you saw locally in Step 0. If
the JSON differs at all, something's wrong in your adapter wiring.

## Step 5 — Measure cold start

```bash
sam logs --stack-name byol-node-express --region us-west-2 -t
# OR Console → CloudWatch → /aws/lambda/byol-node-express → latest stream
```

Find the `REPORT` line. The `Init Duration` value is your cold-start cost.
Record it in the worksheet.

## Teardown

```bash
sam delete --stack-name byol-node-express --region us-west-2
```

## Common pitfalls

| Symptom | Probably... |
|---------|-------------|
| `sam deploy` fails with AccessDenied | Wrong region — must be `us-west-2` on workshop role |
| 502 Bad Gateway from API URL | Handler name in `template.yaml` doesn't match the file/export you created |
| "Cannot find module 'serverless-http'" in logs | Forgot to `npm install` your adapter; `sam build` copies `node_modules` |
| Lambda returns body as string `"[object Object]"` | Adapter didn't serialize JSON — make sure `app.use(express.json())` is set (it is in `app.js`, just confirming) |
| Routes return 404 in Lambda but work locally | Path stripping — API GW gives you full path, adapter handles this; if you wrote your own, this is bug class #1 |
