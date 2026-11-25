# NudgeBee: what we verified (25 Nov, ~13:10 IST)

## Works

- **Automation chain:** trigger → `core.approval` → `scripting.run_script`. Validated, dry-run **COMPLETED**
  (execution `01a211a4-621c-7a72-8d9c-dc16821c92ba`).
- **Approval:** the editor shows "Waiting for approval" with approve/reject buttons and an optional comment.
  The output records who approved: `{"approver": "<user id>", "status": "approve"}`.
- **Run Script runs inside our cluster.** The agent runner starts a pod `nb-runbook-<uuid>` in `nudgebee-agent`,
  image `ghcr.io/nudgebee/nudgebee-debug:0.3.12`, which has `curl`. That pod can reach Flagsmith at
  `http://host.orb.internal:8000` (health check returned 200). Took about 5s with a warm image; the first run was about
  30s because it pulled the image.
- **The script's stdout comes back** as the task output (`output.data`), so later steps can use it.

## Does not work / gotchas

- **`integrations.http` runs in NudgeBee's cloud**, not in our cluster (its DNS is `10.100.0.10`; ours is
  `192.168.194.138`). It also has an SSRF guard ("url failed safety validation"). It cannot reach a local Flagsmith.
  Use it only for public endpoints.
- **The webhook trigger needs `params.integration_name`**, so a webhook integration has to be created in NudgeBee
  first. Not done yet.
- **The relay link drops** every 15–30 minutes with `tls: bad record MAC`, probably the venue network. If a run's
  result lands during a drop, the task fails with "agent not connected" (it retries 3 times, all within seconds).
  For the demo: run it once just before recording, and keep a recorded backup take.
- **Editor quirks:** clicking a node does not open a form. Edit the JSON panel, then press **Apply** before
  Validate or Dry Run.

## Design consequence

NudgeBee's script pod should not hold the Flagsmith admin key. Instead it calls our control-tower service inside the
cluster (`POST /ops/...`), and the control tower holds the key and does the Flagsmith flip.

Why this split is better, which is the answer for judges:

- NudgeBee detects, explains, and gets a human to approve.
- The control tower owns the logistics rules and the credentials.
- Flagsmith owns the live configuration.
- Each secret lives in one place, and the change still shows in Flagsmith's audit log.

## Automation shape that passed

```json
{
  "tasks": [
    {"id": "core_approval", "type": "core.approval", "params": {"message": "..."}},
    {"id": "scripting_run_script", "type": "scripting.run_script",
     "params": {"script": "curl -s ... http://<in-cluster service>/..."},
     "depends_on": ["core_approval"]}
  ],
  "triggers": [{"type": "manual", "params": {}}]
}
```
