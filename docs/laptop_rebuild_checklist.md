# Laptop rebuild checklist (WR-12, Nov 3 2026)

Alex's plan: wipe the laptop clean. RPGACE + beats + footage live on the external drive **E:**. Music software (FL Studio, plugins, Focusrite, OBS) installs on **C:**.
Record: `records/2026-11/week_review_work_mode_paranoia_2026-11-03.txt`.

Do the steps in order. Each step has a **Check**: don't move on until it shows what it says.

---

## 1. Before wiping: copy to E:

Plug in E:, open **Command Prompt** and paste one line at a time.

**1a. RPGACE data (keys, rota login, video reports, alarm sounds):**
```
robocopy "%USERPROFILE%\RPGACE" "E:\RPGACE" /E
```
**Check:** `dir /a E:\RPGACE` lists `.anthropic_key`, `.fourth_credentials`, `intel`, `strategy`, `alarm_sounds`.

**1b. The old working folder, in case it holds anything that never reached GitHub:**
```
robocopy "C:\Users\acesa\Downloads\rpgace-vercel-v4" "E:\Backup\rpgace-vercel-v4" /E
```
**Check:** `dir E:\Backup\rpgace-vercel-v4` isn't empty.

**1c. The `.env` / local-server files you screenshotted on Oct 29:** copy them to `E:\Backup\env`. **Check:** open one from E: in Notepad.

**1d. Claude Code settings and skills (only if Claude Code is installed on the laptop):**
```
robocopy "%USERPROFILE%\.claude" "E:\Backup\dot-claude" /E
```

**1e. FL Studio projects, presets and templates:**
```
robocopy "%USERPROFILE%\Documents\Image-Line" "E:\Backup\Image-Line" /E
```
**Check:** open one `.flp` from `E:\Backup\Image-Line` (after reinstall, or on another machine).

**1f. Samples and loose plugin/preset folders:** copy your sample folders to `E:\Samples`. If you have loose VST3/preset folders, copy them to `E:\Backup\Plugins`.

**1g. OBS:** in OBS use Scene Collection → Export and Profile → Export, saving both to `E:\Backup\OBS`. Then:
```
robocopy "%APPDATA%\obs-studio" "E:\Backup\OBS\obs-studio" /E
```

**1h. Beats and footage still on C:** move them to `E:\Beats` and `E:\Footage`.

**1i. Bitwarden:** Settings → Export vault → `.json (encrypted)` → save to `E:\Backup\bitwarden_export.json`. Your vault itself stays online, so this is just a spare copy.
**Check:** the file exists and isn't 0 KB.

**1j. Browser:** export passwords (into Bitwarden if they aren't there yet) and bookmarks to `E:\Backup`.

**1k. Plugin licences with seat limits:** deauthorise them (iLok License Manager, Waves Central, Native Access, Plugin Alliance). Write each plugin's licence location into Bitwarden.

**1l. Final check before wiping:** pull E: out, plug it back in, and open 2–3 files from it (an `.flp`, a beat, `E:\RPGACE\.anthropic_key` in Notepad).

Things you **don't** need to save:
- `%USERPROFILE%\RPGACE-code`: it's a copy of GitHub.
- The app, the database, the server secrets and the GitHub/Vercel settings: they're all online.

## 2. Wipe

Use Settings → System → Recovery → **Reset this PC** → **Remove everything** → **Cloud download**.
(A clean install from a USB stick is cleaner, but slower.)

## 3. Reinstall, in this order (on C:)

1. Windows Update, until no more updates are offered.
2. **Disk Management:** right-click the external drive → Change Drive Letter → set it to **E:** permanently. **Check:** File Explorer shows `E:`.
3. **Focusrite:** Focusrite Control (Scarlett Solo 3rd gen) or Focusrite Control 2 (4th gen); the generation is printed on the box or the back of the unit.
4. **FL Studio:** download it from your Image-Line account. In FL, go to Options → Audio → Device: **Focusrite USB ASIO**.
5. Plugin managers (Native Access, iLok, Waves Central…), then the plugins themselves. Afterwards, in FL: Options → Manage plugins → **Find installed plugins**.
6. **OBS:** import the Scene Collection and Profile from `E:\Backup\OBS`, and set the recording path to `E:\Footage`.
7. Bitwarden, then your browser.

## 4. RPGACE on E:

```
winget install --id Git.Git -e --source winget
winget install --id Python.Python.3.12 -e --source winget
winget install --id Gyan.FFmpeg -e --source winget
git clone --depth 1 https://github.com/acesanyabeats-web/RPGACE E:\RPGACE-code
```
Then double-click `E:\RPGACE-code\local_server\start_server.bat`. It updates the code, sees `E:\RPGACE` and uses it, and installs what it needs on first run (yt-dlp, Deno, Whisper, certifi). FFmpeg comes from the winget line above (the video analyser cuts frames and audio with it).

Your local pipeline's data (API key, rota login, video reports, transcripts, alarm sounds) is already on `E:\RPGACE` from step 1a; the code comes fresh from GitHub, so nothing else needs saving.
**Check:** the window says `Your data and API key stay in E:\RPGACE` and then `Analyser version …`.

Finally, make a desktop shortcut to `E:\RPGACE-code\local_server\start_server.bat`.

## 5. Software list (WR-11, coming next)

Every program and purchase goes into RPGACE's software list:
- download link, install order, C or E;
- where its licence lives (a Bitwarden entry name, never the key);
- price and date.

Next time you change laptops, section 3 is a tick-through list in the app.
