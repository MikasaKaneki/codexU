#!/usr/bin/env python3
"""Probe real Claude readers with synthetic inputs, without rejecting large files."""
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
destination = root / ".local-artifacts" / "macos-local-readers"
destination.mkdir(parents=True, exist_ok=True)
program = root / "build" / "codexU.app" / "Contents" / "MacOS" / "codexU"
if sys.platform != "darwin" or not program.is_file():
    raise SystemExit("Requires the built macOS application")

records = []
receipt = {"result": "running", "samples": records,
           "scope": "Synthetic complete-read correctness and per-process peak RSS; not a live refresh leak test"}
try:
    with tempfile.TemporaryDirectory(prefix="fixture-", dir=destination) as temporary:
        home = pathlib.Path(temporary)
        skill = home / ".claude" / "skills" / "review" / "SKILL.md"
        skill.parent.mkdir(parents=True)
        tasks = home / ".claude" / "tasks" / "fixture"
        tasks.mkdir(parents=True)
        environment = dict(os.environ, CODEXU_HOME_OVERRIDE=str(home),
                           CODEXU_CACHE_OVERRIDE=str(home / "cache"),
                           CODEXU_RUNTIME_FILTER="claude-code")
        for case, repetitions, padding, task_count in [
            ("normal", 3, 1024, 8), ("large-valid-input", 3, 4 * 1024 * 1024, 128)
        ]:
            text = "review 中\n" * (16 if case == "normal" else 850000)
            skill.write_text(text, encoding="utf-8")
            expected_bytes = len(text.encode("utf-8"))
            (home / ".claude.json").write_text(json.dumps({
                "skillUsage": {"review": {"loadCount": 3}}, "unrelated": "x" * padding
            }), encoding="utf-8")
            (home / ".claude" / "stats-cache.json").write_text(json.dumps({
                "totalTokens": 200000, "todayTokens": 1200, "sevenDayTokens": 3000,
                "totalCostUSD": 1.25, "unrelated": "x" * padding
            }), encoding="utf-8")
            for index in range(task_count):
                (tasks / f"{index}.json").write_text(json.dumps({
                    "status": "pending", "subject": f"Fixture task {index}",
                    "description": "x" * (1024 if case == "normal" else 64 * 1024)
                }), encoding="utf-8")
            for index in range(repetitions):
                timing = destination / f"{case}-{index + 1}.time.txt"
                process = subprocess.run([
                    "/usr/bin/time", "-l", str(program), "--dump-json"
                ], env=environment, capture_output=True, text=True, encoding="utf-8", timeout=30)
                timing.write_text(process.stderr, encoding="utf-8")
                if process.returncode:
                    raise RuntimeError(f"{case}: probe failed ({process.returncode}): {process.stderr[-1000:]}")
                snapshot = json.loads(process.stdout)
                runtimes = snapshot["runtimes"]
                if len(runtimes) != 1:
                    raise RuntimeError("Runtime filter did not isolate the synthetic Claude source")
                runtime = runtimes[0]["snapshot"]
                local = runtime["local"]
                if local["lifetimeTokens"] != 200000 or runtime["taskBoard"]["totalCount"] != task_count:
                    raise RuntimeError(f"{case}: valid usage or tasks were lost")
                observed = next(item for item in local["skillUsages"] if item["name"] == "review")
                if observed["staticByteCount"] != expected_bytes or observed["loadCount"] != 3:
                    raise RuntimeError(f"{case}: the complete Skill file was not processed")
                match = re.search(r"(\d+)\s+maximum resident set size", timing.read_text(encoding="utf-8"))
                if not match:
                    raise RuntimeError("Native peak RSS was not reported")
                peak = int(match.group(1))
                records.append({"case": case, "sample": index + 1, "skill_bytes": expected_bytes,
                                "task_count": task_count, "peak_rss_bytes": peak,
                                "usage_preserved": True, "complete_skill_read": True})
                # This is an acceptance budget for the owned fixture, not an application file-size limit.
                if peak > 512 * 1024 * 1024:
                    raise RuntimeError(f"{case}: synthetic probe peak exceeds 512 MiB")
    receipt["result"] = "PASS"
except Exception as error:
    receipt.update(result="FAIL", error=str(error))
    raise
finally:
    (destination / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"result": receipt["result"], "samples": len(records),
                  "max_peak_rss_bytes": max(item["peak_rss_bytes"] for item in records)}))
