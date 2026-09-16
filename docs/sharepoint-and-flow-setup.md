# SharePoint list + Power Automate setup

Do this **before** publishing the page. Total time: ~20 minutes.

---

## Step 1 — Create the SharePoint list

Create a list named **`CCCPA Responses`** in your NPD site. Add these columns.
Column *internal names* must match the JSON keys exactly or the flow mapping breaks.

| Display name | Internal name | Type | Notes |
|---|---|---|---|
| Title | `Title` | Single line | Default column. Flow writes `email` here so the list is scannable. |
| Email | `email` | Single line | Lowercased by the page. |
| Name | `name` | Single line | Optional respondent entry. |
| Timepoint | `timepoint` | Choice | Pre-training / Post-training / 30-day follow-up |
| Prior WVP training | `priorTraining` | Multiple lines of text | Semicolon-delimited list of programs. Use plain text, not "Choice – multiple selections" — see note below. |
| Prior training count | `priorTrainingCount` | Number | How many programs, excluding "none". Handy for analysis. |
| Any prior training | `anyPriorTraining` | Choice | Yes / No |
| Training recency | `trainingRecency` | Choice | Within the past 12 months / 1–2 years ago / 3–5 years ago / More than 5 years ago / Not applicable |
| Unit | `unit` | Choice | Must match `units` in `config.js` |
| Role | `role` | Choice | Must match `roles` in `config.js` |
| Years in role | `yearsExp` | Choice | |
| Q1 … Q10 | `q1` … `q10` | Number (0 decimals) | Ten separate columns, 1–11 |
| Total score | `totalScore` | Number | 10–110 |
| Mean score | `meanScore` | Number (2 decimals) | |
| Psychological mean | `psychMean` | Number (2 decimals) | Descriptive only |
| Physical mean | `physMean` | Number (2 decimals) | Descriptive only |
| Training mean | `trainMean` | Number (2 decimals) | Descriptive only |
| Submitted (UTC) | `submittedUtc` | Single line | ISO 8601 string. Keep as text — SharePoint date parsing of ISO strings is inconsistent. |
| Timezone | `timezone` | Single line | |
| Client ID | `clientId` | Single line | Per-browser token; helps spot duplicate submissions. |
| Form version | `formVersion` | Single line | |

> **Why `priorTraining` is plain text.** The page sends the selected programs
> two ways: `priorTraining` as a semicolon-delimited string, and
> `priorTrainingList` as an array. A plain-text column takes the string with no
> fuss and never breaks when you add a program to `config.js`. If you'd rather
> have a real multi-select column, make it "Choice – allow multiple selections,"
> map it from `outputs('Payload')?['priorTrainingList']`, and keep the choice
> values in exact sync with `priorTrainingOptions` — a mismatch fails the whole
> flow run, not just that field.

> **Set list permissions now.** Break inheritance and restrict read access to
> the NPD team. Contribute is granted to the flow's connection account, not to
> staff — respondents never touch SharePoint directly.

---

## Step 2 — Build the flow

New **Instant cloud flow** → trigger **"When an HTTP request is received."**

### 2a. Trigger

Leave the request body JSON schema **empty**. The page deliberately sends
`text/plain` (see the CORS note below), so the body arrives as a raw string
and a schema would not match it.

Set **Who can trigger the flow** to **Anyone** (Settings on the trigger).

### 2b. Parse the body

Add a **Compose** action named `Payload`:

```
json(triggerBody())
```

Every downstream reference then looks like
`outputs('Payload')?['email']`, `outputs('Payload')?['q1']`, and so on.

### 2c. Create the item

Add **SharePoint → Create item**, point it at `CCCPA Responses`, and map:

| Field | Expression |
|---|---|
| Title | `outputs('Payload')?['email']` |
| email | `outputs('Payload')?['email']` |
| name | `outputs('Payload')?['name']` |
| timepoint | `outputs('Payload')?['timepoint']` |
| priorTraining | `outputs('Payload')?['priorTraining']` |
| priorTrainingCount | `outputs('Payload')?['priorTrainingCount']` |
| anyPriorTraining | `outputs('Payload')?['anyPriorTraining']` |
| trainingRecency | `outputs('Payload')?['trainingRecency']` |
| unit | `outputs('Payload')?['unit']` |
| role | `outputs('Payload')?['role']` |
| yearsExp | `outputs('Payload')?['yearsExp']` |
| q1 … q10 | `outputs('Payload')?['q1']` … `['q10']` |
| totalScore | `outputs('Payload')?['totalScore']` |
| meanScore | `outputs('Payload')?['meanScore']` |
| psychMean | `outputs('Payload')?['psychMean']` |
| physMean | `outputs('Payload')?['physMean']` |
| trainMean | `outputs('Payload')?['trainMean']` |
| submittedUtc | `outputs('Payload')?['submittedUtc']` |
| timezone | `outputs('Payload')?['timezone']` |
| clientId | `outputs('Payload')?['clientId']` |
| formVersion | `outputs('Payload')?['formVersion']` |

### 2d. Respond — this step is not optional

Add **Request → Response** as the last action:

- **Status Code:** `200`
- **Headers:**
  - `Access-Control-Allow-Origin` → `*` (or, better, your exact Pages origin, e.g. `https://yourorg.github.io`)
  - `Content-Type` → `application/json`
- **Body:** `{ "status": "ok" }`

Without that `Access-Control-Allow-Origin` header the browser blocks the page
from reading the reply, and every submission looks like a failure to the
respondent even though the row lands in SharePoint.

### 2e. Copy the URL

Save the flow, reopen the trigger, copy the **HTTP POST URL**, and paste it
into `endpoint` in `config.js`.

---

## The CORS workaround, and why the page looks like it's doing something odd

The Power Automate HTTP trigger does not answer CORS **preflight** (`OPTIONS`)
requests. A normal `fetch` with `Content-Type: application/json` triggers a
preflight, which gets no valid response, and the POST never fires.

The page therefore sends the JSON body with **no `Content-Type` header at all**.
The browser defaults to `text/plain;charset=UTF-8`, which is a "simple" content
type, so no preflight is issued and the POST goes straight through. This is why
the flow has to call `json(triggerBody())` instead of using a trigger schema.

Do not "fix" this by adding a `Content-Type` header to the fetch call. It will
break submissions.

---

## Security reality check

The flow URL contains its own access signature and is embedded in a public
page's `config.js`. Anyone who views source can see it and post to it.

That is acceptable for an anonymous-ish internal self-assessment, and it is the
standard trade-off for this pattern, but know what it means:

- Anyone on the internet can write rows to the list. Junk submissions are possible.
- The `@med.usc.edu` check happens **in the browser** and is trivially bypassed.
  It stops typos and wrong-address entries, not a determined actor.
- Add a shared secret if you want a speed bump: put a `formKey` value in
  `config.js`, and start the flow with a **Condition** that terminates unless
  `outputs('Payload')?['formKey']` matches. Still visible in source; still only a
  speed bump.

**If you need actual verified identity,** the page has to live inside the tenant
(SharePoint page, Power Apps, or Microsoft Forms) where Entra ID authenticates
the user. GitHub Pages is outside the tenant, so it can never do this.

A reasonable middle path used by a lot of NPD teams: run the GitHub Pages
version for the open pilot, then move to a Power Apps front end once the
instrument is adopted and you want auditable identity.

---

## Reporting

Once rows accumulate, the pre/post analysis you want is a self-join on `email`:

- **Change score** = `Post totalScore − Pre totalScore` per person
- **Paired t-test or Wilcoxon** on those change scores for your abstract
- **Item-level means** pre vs post to show *which* confidence domains moved

Because you're now capturing prior training, two more cuts become available:

- **Baseline confidence by prior training** — AVADE vs CPI vs Welle vs none, on
  the pre-training scores. This is the "does any of what we already buy actually
  move confidence" question, and it's the most interesting thing in the dataset.
- **Change score by prior-training status** — whether naive staff gain more than
  previously-trained staff, which tells you whether your session is redundant
  for part of the room.

Sample sizes per program will be small and self-selected, so treat these as
descriptive and hypothesis-generating, not as a program comparison. Do not let
anyone turn "AVADE scored lower" into a procurement argument off n=9.

Connect Power BI to the list, or just export to Excel and pivot. Watch for:
people who submit a post with no matching pre (drop them from paired analysis,
report them separately), and duplicate submissions at the same timepoint (keep
the first, check `clientId` and `submittedUtc`).
