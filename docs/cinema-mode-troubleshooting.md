# Cinema Mode troubleshooting

## Browser recovery buffer

The companion is disconnected or authentication failed. Check that the companion uses `127.0.0.1`, the URL ends in `/documentary`, and the entered token exactly matches `.env`. Reconnect; buffered batches are idempotent.

## Ollama offline or missing model

Run the preflight command. Confirm Ollama serves `http://127.0.0.1:11434` and `ollama list` contains the configured exact model. The programme uses templates until health recovers.

## Subtitle-only narration

Ollama text was approved but Piper failed. Verify the configured Python executable, `piper-tts`, data directory and voice. Run a single Piper CLI synthesis before restarting the companion.

## OBS authentication failure

Enable WebSocket authentication in OBS and copy the password into `.env`. Do not install a separate WebSocket plugin on modern OBS. Keep the port loopback-only.

## Narration rejected

Inspect the `narration_result` validation errors. Common causes are unsupported numbers, internal-state words, causal language stronger than evidence, an expired deadline or a changed camera/story. Rejection is expected safety behavior.

## Incomplete session

Open `reports/recovery-report.md`. Append-only files remain usable up to their last complete JSON line. Check video/metadata alignment around the recorded discontinuity.

## Performance regression

Switch to `qwen3.5:2b` or template-only narration, reduce generated passage length, ensure only the live model remains resident, and profile simulation tick rate plus OBS render/encoding lag. Do not tune thresholds without collecting a comparable baseline.
