# Cinema Mode configuration

Copy `companion/.env.example` to `companion/.env`. Never commit the populated file.

## Companion

- `DOCUMENTARY_HOST` must remain loopback (`127.0.0.1`, `::1` or `localhost`).
- `DOCUMENTARY_PORT` defaults to `8765`.
- `DOCUMENTARY_SESSION_TOKEN` should be a random value of at least 16 characters. Enter the same token in the live studio panel. It is not saved by the browser.
- `DOCUMENTARY_SESSIONS_DIR` controls durable session output.
- `DOCUMENTARY_MAX_MESSAGE_BYTES` bounds a WebSocket message.

## Ollama

- `OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`.
- `OLLAMA_LIVE_MODEL` defaults to `qwen3.5:4b`; select the benchmark winner for the actual machine.
- `OLLAMA_TIMEOUT_MS` is the hard request deadline.
- `OLLAMA_KEEP_ALIVE` prevents repeated model loading during a live session.

Routine requests use JSON Schema, temperature zero, bounded output and thinking disabled. Model output is still application-validated.

## Piper

- `PIPER_PYTHON` may point directly to the dedicated virtual environment's Python executable.
- `PIPER_DATA_DIR` contains voice model files.
- `PIPER_VOICE` names the configured voice.
- `PIPER_TIMEOUT_MS` bounds synthesis.

## OBS

- Set `OBS_ENABLED=true` only after configuring authenticated OBS WebSocket.
- `OBS_WEBSOCKET_URL` normally uses `ws://127.0.0.1:4455`.
- `OBS_WEBSOCKET_PASSWORD` stays only in `.env`.

With OBS disabled or unavailable, use manual recording synchronization; metadata capture continues.
