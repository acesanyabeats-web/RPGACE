# RPGACE SYSTEM CONTEXT
> Load at the start of every agent call. This is the single source of truth.
> Last updated: 2026-06-18 — all IDs confirmed from live API

## USER
- Name: Alex (AceSanya / RPGACE)
- Location: Derby, UK
- Goal: Famous music producer + content creator
- Platforms: YouTube (@AceSanyaBeats), TikTok, Instagram
- Works hospitality shifts (schedule varies)

## DEFINITIVE CONNECTED ACCOUNTS
All accounts (except Notion) share user_id: pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1

| App       | connected_account_id | user_id                                      | Status  |
|-----------|---------------------|----------------------------------------------|---------|
| Gmail     | ca_7oagofAi-tkv     | pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1 | ACTIVE  |
| YouTube   | ca_yfUI2ySIgkat     | pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1 | ACTIVE  |
| Instagram | ca_BuczS_wYvxRd     | pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1 | ACTIVE  |
| GitHub    | ca_0dwb1yCGD-Dk     | pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1 | ACTIVE  |
| Canva     | ca_9U6ZLJW-DxFg     | pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1 | ACTIVE  |
| Supadata  | ca_rxEcC9_UzPkL     | pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1 | ACTIVE  |
| Notion    | ca_Qfjy_TRBQA7T     | notionACE                                    | ACTIVE  |

*Supadata needs API key set in Vercel env: SUPADATA_API_KEY

## STALE IDs — NEVER USE THESE
These are old connections superseded by reconnection:
- ca_hOmfJVI6y_5I (old Gmail)
- ca_EeQ6y9x4Ip3e / ACESANYAGITHUB (old GitHub)
- ca_TOH1G3bg4g63 / InstagramAceSanya (old Instagram)
- ca_7yEGuE1nVZMv / @AceSanyaBeats URL (old YouTube)
- ca_I51RdED0V1Eu / CANVA-ACESANYABEATS (old Canva)

## API RULES — NEVER BREAK THESE
- Anthropic model: claude-sonnet-4-6
- Composio base: https://backend.composio.dev/api/v3.1
- Every call needs BOTH connected_account_id AND user_id
- Execute endpoint: POST /api/v3.1/tools/execute/{TOOL_NAME}
- Request body: { connected_account_id, user_id, arguments: {} }

## CONFIRMED WORKING TOOLS
- GMAIL_CREATE_EMAIL_DRAFT — {subject, body, to:""} — to always empty string
- GMAIL_FETCH_EMAILS — {max_results, label_ids}
- NOTION_CREATE_NOTION_PAGE — {title, markdown} — use markdown NOT content
- GITHUB_CREATE_A_REPOSITORY — {name, description, private, auto_init}
- GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS — {repo, path, message, content}
- SUPADATA_GET_YOUTUBE_CHANNEL — {id:"@AceSanyaBeats"} — public, no OAuth
- SUPADATA_GET_YOUTUBE_VIDEO — {video_id} — title, views, likes, duration, description
- SUPADATA_GET_YOUTUBE_TRANSCRIPT — {video_id} — full spoken transcript (great for analysis)
- INSTAGRAM_BASIC_DISPLAY_MEDIA_DETAILS — {}
- CANVA_LIST_DESIGNS — {}

## TOOL NAME ERRORS — NEVER USE THESE
- NOTION_CREATE_PAGE → 404 → use NOTION_CREATE_NOTION_PAGE
- YOUTUBE_LIST_VIDEOS → 404 → use SUPADATA_GET_YOUTUBE_CHANNEL
- YOUTUBE_LIST_MY_VIDEOS → 404 → same fix
- claude-sonnet-4-20250514 → invalid model → use claude-sonnet-4-6
- Composio v2 endpoints → 410 → always use v3.1

## URL FETCHING
- Always use Jina AI: https://r.jina.ai/{URL}
- Free, no API key, works on any public URL
