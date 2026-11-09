# MarkCraft Privacy Policy (Anonymous Usage Statistics)

> Effective version: 1.0.0
> This document explains what the built-in "anonymous improvement program" collects, what it does not, and how you control it.
> This policy applies only to in-app anonymous usage statistics. Your note content always remains under your control.

## 1. Core principle

MarkCraft is a **local-first** desktop note-taking app — all your notes are stored on your own device.
The built-in usage statistics are **off by default (opt-in)**: until you explicitly consent, the app **sends no data to any server**.

## 2. We only collect anonymous, aggregated data

After you enable the improvement program, we collect only the following data that contains **no personally identifiable information**:

| Category | Field | Description |
| --- | --- | --- |
| Anonymous ID | Install ID | A random UUID generated locally, used only to deduplicate the same install; unrelated to any personal info |
| Environment | App version, OS, UI language | Used to attribute and segment data |
| Usage | Feature use count | Counts of how often features (editor, graph, blog, canvas, knowledge base…) are used |
| Usage | Feature dwell time | Milliseconds spent on each feature panel (to see what is most/least popular) |
| Health | Crash info | Only the **class name** of uncaught errors (truncated); **never** error messages or any stack content |
| Activity | Daily heartbeat | Used to infer "how long until churn", more reliable than catching uninstall events |

## 3. We never collect

- ❌ Your **note content, titles, file names, or file paths**;
- ❌ Your **personal information** (name, email, account…) — except what you voluntarily enter in User settings, which is unrelated to statistics;
- ❌ Precise **IP address / geolocation**;
- ❌ Anything that could reveal **what you wrote**.

Your note content never leaves your device and never enters the statistics pipeline.

## 4. How data is sent

- Only **after you consent** and only if an endpoint is configured;
- Sent over **HTTPS** to the **privacy-friendly analytics service** you deploy (e.g. Umami, Plausible, PostHog custom-event endpoints);
- Batched and debounced; failures are silently dropped and **never affect normal use**;
- On app close, the last batch is delivered best-effort via `sendBeacon`.

## 5. Your control

- **Off by default**: the first run shows a prompt; only checking "I agree" joins. Otherwise privacy is preserved.
- **Toggle any time**: in Settings → Privacy you can turn it off with one click; turning off **stops sending immediately** and clears any buffered events.
- **Local data**: the install ID lives only in local `localStorage` and is removed when you clear app data.

## 6. Retention and deletion

All reported data is anonymous and aggregated, used for product improvement. Whether and how long it is retained is governed by the analytics service you deploy. The MarkCraft client keeps no copy of sent events.

## 7. Third-party services

MarkCraft does **not impose any specific analytics provider**. The reporting endpoint is configured by the deployer via a build-time environment variable, and data flows to a privacy-friendly analytics service you trust. Please review that service's privacy terms before enabling.

## 8. Contact

For questions about this policy, use the channel on the in-app About page.

---

*This is the English version. If there is any ambiguity, the Chinese version prevails.*
