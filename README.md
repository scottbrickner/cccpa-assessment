# CCCPA Self-Assessment

A single-page web form for administering the **Confidence in Coping with
Patient Aggression (CCCPA)** instrument (Thackrey, 1987) as a pre/post measure
around workplace violence prevention and de-escalation training.

Static site on GitHub Pages. Responses post to FormSubmit.co, which emails a
notification; a Power Automate flow reads that email and writes a row to a
SharePoint list.

**Live:** https://scottbrickner.github.io/cccpa-assessment/

---

## What's here

```
index.html                            the entire form (self-contained)
config.js                             ← the only file you normally edit
.nojekyll                             tells GitHub Pages to serve files as-is
.github/workflows/deploy-pages.yml    Pages deploy, no build step
docs/sharepoint-and-flow-setup.md     ← READ THIS: the full pipeline
docs/CCCPA-SharePoint-list-seed.xlsx  built the list; kept for reference
```

**`docs/sharepoint-and-flow-setup.md` is the real documentation** — the
architecture, the two design decisions the flow depends on, the exact
Power Automate expressions, the column index map, and the gotchas.

## Deploy

GitHub Pages, via the Actions workflow already in `.github/workflows/deploy-pages.yml`
— the same convention as `ct-surgery-sim-bundle`: plain static files, no build step.

1. Create the repo (e.g. `scottbrickner/cccpa-assessment`) and push these files to `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The workflow runs on every push to `main`. Live URL:
   `https://<user>.github.io/cccpa-assessment/`
4. Follow `docs/sharepoint-and-flow-setup.md`, paste the flow URL into
   `endpoint` in `config.js`, and push again.

Until `endpoint` is set the page runs in **local-only mode**: it scores the
instrument and offers a CSV download, but transmits nothing. That mode is a
good way to pilot with a few people before building the flow.

`index.html` references `config.js` by a relative path, so it works served from
a project subpath without modification.

## Configure

Everything tunable lives in `config.js`:

- `formSubmitId` — the FormSubmit destination (currently a masked random ID, not the raw email). Set to `""` for local-only mode: scores and CSV download, nothing transmitted.
- `formSubmitAjax` — keep `true`; the AJAX endpoint avoids the captcha interstitial
- `emailSubject` — subject template, tokens `{email} {localpart} {timepoint} {unit} {role} {name}`
- `timepoints` — a string, or `{value, disabled:true}` to show but grey out
- `units` — a string, or `{label, options:[...]}` for an `<optgroup>`
- `fieldDefaults` — pre-selected values
- `fieldNotes` — a short line under a field's label
- `allowedEmailDomains`, `roles`, `priorTrainingOptions`, `trainingRecencyOptions`
- `showScoreToRespondent`, `showDescriptiveGroupings`

Two things in `index.html` that look like style choices but are load-bearing,
both commented in place: `csv_row` is wrapped in `[[CSV]]` sentinels, and every
CSV field is quoted unconditionally. The flow depends on both. See the setup doc.

## What the page does

- Renders all 10 items on the original 11-point scale with the original anchors
- Requires a valid `@med.usc.edu` / `@usc.edu` address so pre and post can be paired
- Captures prior formal WVP/de-escalation training as a multi-select, plus how recently
  they last trained — selecting "no prior formal training" clears the other boxes and
  disables the recency question
- Blocks submission until every item is answered, and scrolls to the first gap
- Saves a draft to the browser as the respondent works, so a refresh doesn't lose answers
- Queues the submission locally and retries on next visit if the network is down
- Shows the respondent their total, their mean, and an item profile sorted
  lowest-first — which doubles as a personal "here's where to focus" debrief
- Offers a CSV of their own response as a backup path (no resubmit option — one response per visit)

Keyboard-navigable, screen-reader labeled, works on a phone, respects dark mode.

## Scoring

Total = sum of the 10 items, range **10–110**. Mean = total ÷ 10, range 1–11.
Higher = greater confidence. No reverse-scored items. No published clinical
cut scores — the instrument is used for **change over time**, not for
classifying individuals as adequate or inadequate.

> **Caveat on the subscales.** The page can display "Psychological," "Physical,"
> and "Training / technique" groupings. Thackrey validated the CCCPA as a
> **single unidimensional scale**; these groupings are a descriptive convenience
> for training debriefs, not validated subscales. Do **not** report them as
> subscale scores in an abstract or manuscript. Set
> `showDescriptiveGroupings: false` if that risk isn't worth the debrief value.

## Current study state

Baseline only. Post-training and 30-day follow-up appear in the timepoint
dropdown but are disabled, because no intervention has been defined yet —
re-opening them is deleting `disabled: true`, with no schema change.

Unit defaults to `ICU Float Pool` and is scoped to 21 direct-care inpatient
units from the KHS roster.

## Before you go live

- [x] **Permissions for the instrument.** The author has granted permission to
      use the CCCPA for this project, so a public URL is not a problem. Keep the
      written grant on file — journals, conference reviewers, and IRB staff
      routinely ask to see it, and "we have permission" without documentation
      tends to stall a submission.
- [ ] **IRB / QI determination.** If any of this becomes a poster, abstract, or
      manuscript, get a human-subjects determination *first*. Retroactive
      determinations are a bad time.
- [ ] **Read the security section** in the setup doc. The flow URL is visible in
      page source, and the email domain check is client-side only.
- [ ] **Privacy language.** The footer states that individual scores aren't
      shared with managers. Make sure that's actually true of your process, and
      run the wording past whoever owns staff-data governance.
- [ ] **Don't put patient information on this form.** Nothing here is built for PHI.

## Citation

Thackrey, M. (1987). Clinician confidence in coping with patient aggression:
Assessment and enhancement. *Criminal Justice and Behavior, 14*(1), 57–60.

Used with permission of the author.
