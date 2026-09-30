# CCCPA response pipeline — how it actually works

Built and verified 2026-09-16. This documents the system as deployed, not as
originally planned. An earlier version of this file described a Power Automate
HTTP-trigger design that was abandoned; ignore any copy of it you find.

**Live form:** https://scottbrickner.github.io/cccpa-assessment/
**List:** `CCCPA Responses` on `.../sites/ASCENDAnnualSkills2`

---

## The path a response takes

```
Respondent's browser
    |  POST (JSON) to https://formsubmit.co/ajax/<form id>
FormSubmit.co
    |  notification email -> scott.brickner2@med.usc.edu
Outlook Inbox
    |  Power Automate: "When a new email arrives (V3)", subject contains CCCPA
Flow: 4 Compose actions slice csv_row out of the HTML body
    |
SharePoint list "CCCPA Responses"  <- system of record
```

### Why email in the middle, rather than posting straight to a flow

The first build posted directly to a Power Automate HTTP trigger. It was
abandoned because `Create item` silently dropped fields on some runs. The
likely cause was Choice columns rejecting values not in their choice list —
Choice failures don't error, they just leave the field blank.

The email-trigger design is slower (a minute or two of mail latency) but far
more debuggable:

- the source email sits in Outlook and can be re-read at any time
- a failed run can be replayed with **Resubmit** in run history, with no new
  form submission needed
- the flow's raw trigger output shows exactly what arrived

It also removed the CORS workaround the HTTP trigger required.

---

## Part 1 — the form

Everything tunable lives in `config.js`. `index.html` reads all of it and
should not need editing.

| Key | What it does |
|---|---|
| `formSubmitId` | The FormSubmit destination. Currently the masked random ID, not the raw email. |
| `formSubmitAjax` | `true` = `/ajax/` endpoint: no captcha screen, no page navigation. Leave it true. |
| `emailSubject` | Subject template. Tokens: `{email} {localpart} {timepoint} {unit} {role} {name}` |
| `allowedEmailDomains` | Client-side domain check on the respondent's address |
| `timepoints` | An entry may be a string, or `{value, disabled:true}` to show but grey out |
| `units` | An entry may be a string, or `{label, options:[...]}` for an `<optgroup>` |
| `roles`, `trainingRecencyOptions`, `priorTrainingOptions` | Plain string lists |
| `fieldDefaults` | Pre-selected values, e.g. `{unit: "ICU Float Pool"}` |
| `fieldNotes` | A short explanatory line under a field's label |
| `showScoreToRespondent`, `showDescriptiveGroupings` | Results-screen toggles |

Setting `formSubmitId` to `""` puts the page in **local-only mode**: it scores
and offers a CSV download but transmits nothing. Useful for piloting.

### Two design decisions that the flow depends on

**1. `csv_row` is wrapped in sentinels.**

```
[[CSV]]"2026-09-16T22:29:47.999Z","scott.brickner2@med.usc.edu",...,"1.0.0"[[/CSV]]
```

The flow slices between `[[CSV]]` and `[[/CSV]]` — markers we control — rather
than FormSubmit's `<td>/<pre>` table markup, which they can change without
warning. If you ever rebuild the flow, key off the sentinels.

**2. Every CSV field is quoted, unconditionally.**

Normal minimal-CSV practice is to quote only fields containing commas. That
breaks this pipeline: the flow splits on the `","` field boundary, which
requires that no field is ever bare. `csvLine()` in `index.html` carries a
comment saying so. Do not "optimise" it.

Excel reads a fully-quoted row identically, so the download button is unaffected.

### Column order — 29 fields, fixed

`CSV_COLS` in `index.html` is the single definition used by both the download
button and the emailed `csv_row`, so the two cannot drift.

```
 0 submittedUtc        8 priorTrainingCount   16-25 q1 ... q10
 1 email               9 anyPriorTraining     26 timezone
 2 name               10 trainingRecency      27 clientId
 3 timepoint          11 totalScore           28 formVersion
 4 unit               12 meanScore
 5 role               13 psychMean
 6 yearsExp           14 physMean
 7 priorTraining      15 trainMean
```

Changing this order silently corrupts the flow's field mapping. If you add a
field, append it at the end and add a matching SharePoint column.

---

## Part 2 — FormSubmit

Activation is per **email address + domain**, not per address. A form on a new
host needs its own handshake even if the destination address is already active.

Current form ID: `82b5afae35bdfa8b7efe6a40c50a7745` (an alias for the
destination address, so the raw email is not in public page source).

**No `_autoresponse`.** It only works with a native POST, which forces the
reCAPTCHA interstitial — exactly the friction the QR-code workflow exists to
avoid. The respondent already sees their score on screen, and `_autoresponse`
is a static string that could not include it anyway.

`_captcha: "false"` is set. Safe here precisely because there is no
autoresponse; that is the one feature disabling the captcha would break.

**FormSubmit stores nothing.** Delete an email and that response is gone —
there is no export. The SharePoint list is the only durable copy.

---

## Part 3 — the flow

Trigger: **Office 365 Outlook → When a new email arrives (V3)**

| Setting | Value |
|---|---|
| Folder | `Inbox` |
| From | `submissions@formsubmit.co` |
| Subject Filter | `CCCPA` |
| Include Attachments | No |
| Only with Attachments | No |
| Importance | Any |

The subject filter is a substring match, so it catches every respondent's
subject line while never colliding with the Unit In-Service flow. Do not put
the em-dash in the filter.

> **If you ever add an Outlook rule** that files these into a folder, the
> trigger stops firing — it watches Inbox. Repoint the trigger to that folder
> in the same sitting, or skip the rule.

### The Compose chain

Four Compose actions. Action names matter: Power Automate converts spaces to
underscores in `outputs()` references.

**`Get text after CSV marker`**
```
substring(triggerBody()?['body'], add(indexOf(triggerBody()?['body'], '[[CSV]]'), length('[[CSV]]')))
```

**`Extract CSV row`**
```
substring(outputs('Get_text_after_CSV_marker'), 0, indexOf(outputs('Get_text_after_CSV_marker'), '[[/CSV]]'))
```

**`Decode CSV row`** — FormSubmit HTML-escapes the quotes
```
replace(replace(outputs('Extract_CSV_row'), '&quot;', '"'), '&amp;', '&')
```

**`Split CSV row`** — strips the outer quotes, splits on the field boundary
```
split(substring(outputs('Decode_CSV_row'), 1, sub(length(outputs('Decode_CSV_row')), 2)), '","')
```

Output is an array of exactly **29** strings. Verified against a real email.

Three things about the real email body, confirmed rather than assumed:

- quotes arrive as `&quot;`; nothing else inside the value needs decoding
- a hidden preview `<div>` at the top carries a truncated plain-text copy of
  the first few fields, but it stops before `csv_row`, so `indexOf('[[CSV]]')`
  finds the right one
- Proofpoint injects an "Untrusted Sender" banner into the body; irrelevant,
  because the slice is anchored on the sentinels rather than on position

Known cosmetic gap: an apostrophe in a respondent's name arrives as `&#39;`.
To fix, add one more nesting to `Decode CSV row`:
`replace(<the whole expression>, '&#39;', '''')` — four quote marks, which is
Power Automate's escaping for a single `'`.

### Create item

Site `ASCENDAnnualSkills2`, list `CCCPA Responses`. Map via the **Expression**
tab, not the dynamic-content picker.

| SharePoint field | Expression |
|---|---|
| Title | `outputs('Split_CSV_row')?[1]` |
| Name | `outputs('Split_CSV_row')?[2]` |
| Timepoint | `outputs('Split_CSV_row')?[3]` |
| Unit | `outputs('Split_CSV_row')?[4]` |
| Role | `outputs('Split_CSV_row')?[5]` |
| Years in role | `outputs('Split_CSV_row')?[6]` |
| Prior training | `outputs('Split_CSV_row')?[7]` |
| Prior training count | `outputs('Split_CSV_row')?[8]` |
| Any prior training | `outputs('Split_CSV_row')?[9]` |
| Training recency | `outputs('Split_CSV_row')?[10]` |
| Q1 … Q10 | `outputs('Split_CSV_row')?[16]` … `?[25]` |
| Total score | `outputs('Split_CSV_row')?[11]` |
| Mean score | `outputs('Split_CSV_row')?[12]` |
| Psychological mean | `outputs('Split_CSV_row')?[13]` |
| Physical mean | `outputs('Split_CSV_row')?[14]` |
| Training mean | `outputs('Split_CSV_row')?[15]` |
| Submitted UTC | `outputs('Split_CSV_row')?[0]` |
| Timezone | `outputs('Split_CSV_row')?[26]` |
| Client ID | `outputs('Split_CSV_row')?[27]` |
| Form version | `outputs('Split_CSV_row')?[28]` |

**`Title` is the email** — there is no separate Email column. The Excel import
that created the list folded the first spreadsheet column into `Title`.

**The index order and the list's column order differ.** Q1–Q10 are 16–25 while
the score columns are 11–15. Filling the Create item form straight down in
index order puts Total score into Q1.

**No special-type wrappers are needed.** Every column is Text, Note, or Number
— no booleans, hyperlinks, or Date-Only fields. The 16 Number columns accept
numeric strings and Power Automate coerces them. If one ever throws a type
error, wrap that one in `float(...)`.

**Keep the columns out of Choice.** They were created as Text by the Excel
import, and that is load-bearing: Choice columns are the most likely
explanation for the original silent-drop failures.

---

## Part 4 — study design as currently configured

**Baseline only.** `timepoints` shows Post-training and 30-day follow-up but
marks them `disabled: true`, because no intervention has been defined yet.
Re-opening them is deleting `disabled: true` — no schema change, because the
Timepoint column is plain text and already accepts any string.

**Unit defaults to `ICU Float Pool`**, matching the study population. Strings
match the KHS roster's Department field exactly, so responses can be joined to
staffing data. Note it is "ICU Float Pool", not "Float Pool ICU".

Scoped to 21 direct-care inpatient units (~1,248 active staff). Deliberately
excluded: Periop Float Pool, all 12 periop/procedural areas, and the two
non-direct-care departments. There is no Emergency Department in the KHS
roster — it is inpatient and periop only.

**A defaulted unit has a cost.** Anyone who does not look submits ICU Float
Pool. Fine while the population is float pool; delete the `fieldDefaults`
entry before extending to broader RN/CNA groups.

**No resubmit.** The results screen offers only a CSV download. A reload still
lets someone submit again, so it is a speed bump against accidental
duplicates, not a lock. `Client ID` (per browser) and `Submitted UTC` are how
you spot real duplicates.

---

## Part 5 — analysis

Pairing key is `Title` (email) + `Timepoint`. Once post data exists:

- **Change score** = Post `Total score` − Pre `Total score`, per person
- **Paired t-test or Wilcoxon** on those change scores
- **Item-level means** pre vs post, to show which confidence domains moved

Prior-training cuts that open up:

- baseline confidence by program — CPI vs AVADE vs Welle vs MOAB vs none
- change score by prior-training status, i.e. whether the session is redundant
  for previously-trained staff

Sample sizes per program will be small and self-selected. Descriptive and
hypothesis-generating only. Do not let "AVADE scored lower" become a
procurement argument off n=9.

**The three group means are not validated subscales.** Thackrey validated the
CCCPA as unidimensional. Psychological / Physical / Training are a convenience
for training debriefs. Do not report them as subscales in an abstract.

---

## Part 6 — gotchas worth remembering

**Two copies of every file.** The repo lives on the Mac; edits made in a cloud
session must be written to both. A config change applied to only one side
silently reverted `formSubmitId` to `""` once, which would have put the live
form back into local-only mode with no visible error.

**GitHub Pages caching.** After a push, a fetch of `config.js` can return the
old file for a while. Append a query string (`?v=2`) to bust it when verifying.

**The first Actions run will fail** if you push before setting Pages Source to
GitHub Actions. Re-run it after; nothing is wrong with the build.

**Your email is in the git history** from the Phase 1 commit, even though the
live page now uses the masked ID. Accepted, not fixed.

---

## Maintenance quick reference

| To change | Edit |
|---|---|
| Where responses go | `formSubmitId` in `config.js` |
| Subject line format | `emailSubject` in `config.js` |
| Open post-training | delete `disabled: true` from that timepoint |
| Unit list | `units` in `config.js` |
| Remove the unit default | delete `fieldDefaults.unit` |
| Add a data field | append to `CSV_COLS`, add a SharePoint column, add a Create item mapping at the new index |

Every change is a push to `main`; the Pages workflow redeploys automatically.
