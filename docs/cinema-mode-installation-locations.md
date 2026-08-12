# Cinema Mode installation locations

This guide is for operator setup after implementation. Do not reinstall anything until the verification script has shown what is already present.

## Run the read-only inventory

From the project root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\scripts\verify-cinema-mode-installations.ps1'
```

`Bypass` applies only to this new PowerShell process; it does not alter the machine or user execution policy. It is included because this machine currently blocks local scripts.

It writes `cinema-mode-installation-inventory.json` in the current directory. To choose another output path:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\scripts\verify-cinema-mode-installations.ps1' -OutputPath 'C:\tmp\cinema-mode-installation-inventory.json'
```

The script does not install packages, download models, start or stop services, or alter configuration. It checks localhost only. Secret values are not included; a companion `.env` contributes key names only, and the OBS WebSocket password is reduced to a true/false presence flag.

## Recommended location layout

| Component | Recommended location | Reason |
| --- | --- | --- |
| Project source | `C:\Users\louie_000\Documents\Codex\2026-07-28` | Keep code and versioned fixtures together. |
| Node.js | Installer default, normally `C:\Program Files\nodejs` | A shared machine tool; do not copy it into the repository. |
| Companion Node packages | `C:\Users\louie_000\Documents\Codex\2026-07-28\companion\node_modules` | Created from the companion lockfile when installation is actually authorized. |
| Ollama application | Installer default, normally `%LOCALAPPDATA%\Programs\Ollama` | Standard Windows update and discovery behaviour. |
| Ollama models | Existing `OLLAMA_MODELS` location, or `%USERPROFILE%\.ollama\models` by default | Do not move models merely for tidiness. If the system drive is tight, use a dedicated large drive such as `D:\LivingLaboratory\OllamaModels`. |
| Piper environment | `%LOCALAPPDATA%\LivingLaboratory\piper\.venv` | Keeps Python tooling out of source control and separate from general Python packages. |
| Piper voices | `%LOCALAPPDATA%\LivingLaboratory\piper\voices` | Stable absolute path shared by companion runs. |
| OBS Studio | Installer default, normally `C:\Program Files\obs-studio` | Standard OBS location and updates. |
| FFmpeg | Existing package-managed location; otherwise `C:\Tools\ffmpeg` | Use explicit `ffmpeg.exe` and `ffprobe.exe` paths in configuration if PATH discovery is ambiguous. |
| Session metadata and media | Prefer `D:\LivingLaboratory\DocumentarySessions` on a large fast drive; fallback `%USERPROFILE%\Videos\Living Laboratory\Documentary Sessions` | Keeps high-volume recordings out of the repository and away from model/application files. |
| Companion secrets | `C:\Users\louie_000\Documents\Codex\2026-07-28\companion\.env` | Local operator configuration only; never commit it. Use absolute runtime paths. |

The `D:` examples are recommendations only. The inventory report lists available filesystem drives and free space so the final choice can be made from the actual machine state.

## What to return for a tailored installation plan

Send back `cinema-mode-installation-inventory.json`. Also state whether recordings must stay on a particular drive and whether Ollama is used by other projects. With that information, the final operator commands can preserve existing models and environments instead of creating duplicates.

## Model plan status

The architecture has not changed: templates remain the always-available safe tier; `qwen3.5:4b` remains the first live-quality candidate; `qwen3.5:2b` is the lower-load candidate; `qwen3:1.7b` is a useful installed baseline when present; and `qwen3.5:9b` is initially reserved for asynchronous editorial work. Gemma 4 E2B remains optional.

These are benchmark candidates, not a fixed download list. The inventory must be reviewed first, followed by full-workload tests with the simulation, Piper, and OBS. The production choice is whichever candidate passes factual-safety, ready-audio deadline, simulation stability, and OBS recording-health gates on this machine.
