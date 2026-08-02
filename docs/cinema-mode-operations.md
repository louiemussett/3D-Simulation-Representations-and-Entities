# Cinema Mode operations

## Start

1. Start Ollama and confirm the configured model is installed.
2. Start OBS, select the documentary scene and confirm the recording directory and audio tracks.
3. From the project root, run `npm.cmd run documentary:preflight`.
4. Resolve red results. Optional unavailable services may remain in their documented degraded mode.
5. Run `npm.cmd run documentary:companion`.
6. Start the simulation with `run.ps1`, then enter Movie mode. The launcher reads the token from `companion/.env` and supplies it to this browser tab in memory; it is not placed in the URL, cookies or browser storage.
7. Movie mode connects automatically. **Connect companion** is only a retry/manual-fallback control. Confirm the status says **Recording with companion** before relying on automated OBS control.

## During a session

- Highlight, Keep, Compress and Remove create non-destructive operator markers.
- Safe camera abandons the current shot portfolio and selects a landscape fallback.
- Pause AI stops new model narration while deterministic Movie mode continues.
- Mute narration does not stop event, camera or editorial logging.
- Service and story status remain visible in the studio panel.

## Stop

Exit Movie mode. The browser flushes its batch, requests session finalization and the companion stops controlled OBS recording, closes JSONL files and generates subtitles/reports/editing plans. Never delete the original recording when producing a review cut.

## Crash recovery

The browser stores unacknowledged batches in IndexedDB. On reconnect it resends them with stable batch and record IDs. If the owning browser disappears, the companion allows 10 seconds for reconnection and then stops OBS, marks the session `ABANDONED`, preserves its recording details and generates exports. At companion startup, sessions lacking `.complete` are marked `RECOVERABLE`; their files are retained and a recovery report records the discontinuity.

## Audit the latest recording

Run `npm.cmd run documentary:audit` from the project root. Pass a session directory as an additional argument to audit a specific run. The command writes `reports/commissioning-audit.json` and exits non-zero when completion, timeline, narration or recording checks fail.

## Commissioning

Run metadata-only, subtitle, Piper, OBS, failure-injection, one-hour and six-hour tests in that order. Select a live model only after it meets factual, P99 deadline, simulation tick and OBS dropped-frame gates under the full workload.
