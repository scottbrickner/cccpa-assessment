# CCCPA — nothing showed up. Where did it break?

Four hops. Find the first one that failed; everything downstream is a symptom.

```
browser  ──POST──▶  FormSubmit  ──email──▶  Outlook Inbox  ──trigger──▶  Flow  ──▶  SharePoint list
   1                    2                        3                        4
```

**Check the Inbox first.** It is the cheapest, most informative checkpoint, and it
splits the problem in half: an email present means the break is downstream (3–4),
an email missing means upstream (1–2).

---

## Resolved — 2026-09-29: FormSubmit is down, site-wide

**Root cause: FormSubmit returns HTTP 500 on every POST. It is their outage, not this
form.** Nothing in the page, the ID, the activation, the flow or the list is wrong.

### How it was proven

A cross-origin `fetch` cannot read a response that carries no CORS header, which is why
the page only ever saw `Failed to fetch`. A **native form POST** navigates the browser
to FormSubmit's response page instead, and that page *is* readable. That is the trick:

| Probe | Result |
|---|---|
| `GET https://formsubmit.co/` | **200** — the site is up |
| `GET` the AJAX endpoint | **405**, `type: cors` — endpoint reachable, ID valid, CORS headers present on GET |
| `fetch` POST — JSON, urlencoded, and FormData | `TypeError: Failed to fetch` (all three; rules out a CORS preflight, since the last two are simple requests) |
| `fetch` POST with `mode: "no-cors"` | resolves opaque — the request does leave the browser |
| **Native form POST to our form ID** | **HTTP 500** — *"Looks like we are having some server issues."* |
| **Native form POST to a nonexistent form ID** | **HTTP 500** — the same page |

The control POST is what settles it: a form ID that does not exist fails identically, so
the fault cannot be specific to this form. FormSubmit's submission handling is broken for
everyone. The 500 page carries no CORS header, which is why the AJAX call sees a bare
network error rather than a status code.

### What is actually healthy

- **The flow.** `CCCPA → SharePoint` lives in the **`Brickner, Scott`** environment — not
  `ASCEND | Annual Skills`, which is where it is natural to look first. Status **On**.
  Six runs in 28 days, **zero failures**. Trigger reads `from: submissions@formsubmit.co`,
  `subjectFilter: CCCPA`. Last run Sep 28 10:02, every step green through `Create item`.
- **The submissions that got through.** Sep 23 email ↔ Sep 23 12:25 run. Sep 28 emails ↔
  the two Sep 28 runs. Those rows should be in the list.
- **The page.** Config loaded, ID present, AJAX mode on, offline queue working exactly as
  designed.

> **A date trap worth naming.** Power Automate showed "Sep 28 · 1 day ago" while Outlook
> showed the same email as "Yesterday". Local time was Sep 29, 7:00 PM PDT — so both were
> right and it looked like a missing run that never existed. Read the browser clock before
> reasoning about relative timestamps across two apps.

### What to do

1. **Wait it out, then re-probe** with the native POST above. A thank-you page instead of
   a 500 means it is back.
2. **Do not drive traffic to the link until it is.** Every submission during the outage
   strands in that person's browser and only returns if *they* reopen the link on *that*
   browser without having cleared site data.
3. **One response is currently stranded** — submitted 2026-09-30 01:46 UTC (Sep 29,
   6:46 PM PDT) on Scott's browser. It will send itself on the next visit after recovery.
   Do not clear that browser's site data.
4. **Once it is back**, repost the link and ask anyone who already filled it out to open it
   once more, so their queued copy flushes.

### The uncomfortable part

FormSubmit is a free third-party relay with no status page, no SLA, and **no retention** —
if a submission does not produce an email, it never existed. This outage cost nothing
because almost nobody had the link yet. The same outage during a unit-wide push would
lose responses silently, and the page would tell every person that their answers were
saved. Worth deciding, before the real launch, whether that risk is acceptable or whether
collection should move inside the tenant.

---

## Hop-by-hop, for next time

### 1. Did it leave the browser?

Open the form, F12 → **Network**, submit, and look for the POST to `formsubmit.co`.

- **No request at all** → the page is in local-only mode (`formSubmitId` empty in
  `config.js`), or a script error killed the handler. Check the **Console** tab.
- **Request present, red / (failed)** → what we have now. Click it, read
  **Response** and **Headers**.
- **Request present, 200** → it left. Go to hop 2.

Check that browser's queue from the Console:

```js
JSON.parse(localStorage.getItem('cccpa.queue.v1') || '[]').length
```

Anything above `0` is a response stranded on that device. It flushes on the next
visit **in that same browser** — so tell that person to reopen the link, and tell
them not to clear site data first.

### 2. Did FormSubmit accept it?

There is no dashboard and **no retention** — the notification email is the only
record. If no email arrived, the response is gone the moment its browser's queue is
cleared.

Causes, most likely first: activation lapsed for the email + domain pair; the form ID
in `config.js` no longer matches the active one; rate limiting.

### 3. Did the email land in the Inbox?

Search `from:submissions@formsubmit.co`. Check **Junk** and the **Other** tab too.

> **An Outlook rule that files these into a folder stops the flow.** The trigger
> watches Inbox. If a rule was added, either remove it or repoint the trigger to
> that folder in the same sitting.

### 4. Did the flow run, and did it write?

Power Automate → the flow → **28-day run history**.

| Symptom | Cause | Fix |
|---|---|---|
| No run at all, but the email is in the Inbox | Subject filter mismatch, sender filter mismatch, a rule moved the mail, or the flow is turned off | Check the trigger's Folder / From / Subject Filter. A flow with no successful runs for 90 days is auto-disabled. |
| Run failed | Open the failed action, read **Show raw inputs** *and* **Show raw outputs** — the outputs usually name the failing field; the banner at the top rarely does | Fix and use **Resubmit** to replay against the same email — no new submission needed |
| Split returned one element | A CSV field went out unquoted; the flow splits on the `","` boundary | Every field must be quoted unconditionally |
| Run succeeded, row blank or missing | A Choice column silently dropping a value it doesn't recognize; or you are looking at a filtered list view | Convert Choice columns to Single line of text; check the view |

---

## Fixes to make once the Inbox answers the question

**If the probes arrived** — the transport is fine and only the response read is
broken. Stop depending on reading it:

- POST with `mode: "no-cors"` and treat a resolved promise as sent, or
- keep the normal POST and, on `TypeError`, fall back to one `no-cors` POST before
  queueing.

Either way the page stops telling people their response failed when it did not.

**If the probes did not arrive** — re-activate the form, then re-verify with one real
submission end to end before telling anyone else to use the link.

**Either way, two changes worth making:**

1. **Record why.** `queue()` currently stores the payload and throws the error away,
   which is why this took a browser session to reconstruct. Store the message and the
   attempt count on the queue entry.
2. **Reconcile periodically.** FormSubmit keeps nothing, so the emails *are* the
   backup. Count `from:submissions@formsubmit.co` against rows in **CCCPA Responses**.
   A gap means the flow dropped something — and the email is still there to replay
   with **Resubmit**. Do not delete those emails until the row exists.

---

## Anyone who submitted during the outage

Their response is sitting in their own browser's queue and will send itself the next
time they open the link **on that same browser**. After the fix, post the link again
and ask people who already filled it out to open it once more. Anyone who has since
cleared their browser data is unrecoverable — which is the argument for fixing the
"record why" gap above before the next launch.
