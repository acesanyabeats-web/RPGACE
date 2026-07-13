# n8n workflows

Importable n8n workflow JSON files for RPGACE automation. Import via n8n's
editor: **Workflows → Import from File**.

## rota_sync_workflow.json — F10, Fourth rota sync

Cron trigger (Monday 8am) → Execute Command node running `fourth_rota.py`.

**Before activating:**
1. Create `C:\Users\acesa\RPGACE\.fourth_credentials` with your Fourth
   username on line 1, password on line 2 (plain text — this file never
   leaves your machine and is outside the git-tracked repo).
2. Confirm the path in the Execute Command node matches where you actually
   cloned this repo — it currently assumes
   `C:\Users\acesa\Downloads\rpgace-vercel-v4\scripts\fourth_rota.py`.
3. If n8n runs in Docker rather than natively on Windows, the command node
   runs *inside the container* — it won't see your Windows filesystem or
   have Python/Playwright installed unless you've volume-mounted the repo
   and installed dependencies in that container. Native (non-Docker) n8n
   is the simpler path for this one.
4. Run it manually once from the n8n editor first (▶ button on the node)
   before trusting the Monday schedule — confirm in the execution log
   that it reaches the schedule page without hitting either of the two
   manual "press Enter" fallback gates still in the script. If it does
   hang, the node just times out; check stdout in the execution log to
   see how far it got.
5. Only flip the workflow to Active once step 4 has succeeded at least once.
