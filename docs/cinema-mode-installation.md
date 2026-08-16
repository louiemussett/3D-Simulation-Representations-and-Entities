# Cinema Mode local runtime installation

The implementation does not install external software automatically.

1. Install a project-supported Node.js LTS and verify `node --version` and `npm --version`.
2. Install Ollama for Windows. Start with `ollama pull qwen3.5:2b`, then benchmark `qwen3.5:4b`. Use `qwen3.5:9b` for asynchronous editorial work only if full-workload tests pass.
3. Create a dedicated Python virtual environment, install `piper-tts`, download the configured voice and verify one WAV synthesis.
4. Install OBS Studio, configure its scene and recording tracks, then enable authenticated WebSocket under **Tools → WebSocket Server Settings**.
5. Install an FFmpeg Windows build linked from the official FFmpeg download page only when review-cut generation is enabled.
6. Copy `companion/.env.example` to `companion/.env`, populate local paths and secrets, then run the preflight command.

Official references:

- https://docs.ollama.com/windows
- https://ollama.com/library/qwen3.5
- https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/CLI.md
- https://obsproject.com/kb/remote-control-guide
- https://ffmpeg.org/download.html
