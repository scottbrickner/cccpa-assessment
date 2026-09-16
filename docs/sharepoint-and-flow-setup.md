# SharePoint list + Power Automate flow

Everything needed to turn the live page into a data-collecting instrument.
Total time: about 25 minutes.

Live page: **https://scottbrickner.github.io/cccpa-assessment/**
(currently local-only — it collects nothing until Step 3 below)

---

## Step 1 — Create the SharePoint list from the seed file

`CCCPA-SharePoint-list-seed.xlsx` (next to this file) exists so you don't have
to create 29 columns by hand. SharePoint infers them from the spreadsheet.

1. Go to the SharePoint site where the list should live.
2. **+ New → List → From Excel.**
3. Upload the seed file and pick the table **`CCCPAResponses`**.
4. **Check the column types on the import screen.** SharePoint guesses, and it
   guesses wrong on at least one:
   - **Submitted UTC → change to Single line of text.** It will guess Date.
     Keep it as text; SharePoint's parsing of ISO 8601 strings is inconsistent
     and you lose nothing, since the flow writes a clean sorted string.
   - **Prior training → Multiple lines of text.** Not a multi-choice column
     (see the note below).
   - Q1–Q10, the means, the totals, and Prior training count → **Number**.
   - Everything else → Single line of text or Choice, your preference.
5. Name the list **`CCCPA Responses`** and create it.
6. **Delete the two sample rows.** They exist only so SharePoint can infer
   types. The READ ME sheet in the workbook says this too, but it's the step
   people forget.
7. **Set permissions now.** Break inheritance and restrict the list to the NPD
   team. Respondents never touch SharePoint directly — only the flow's
   connection account writes here.

> **Why `Prior training` is plain text, not a multi-choice column.** The page
> sends the selected programs two ways: `priorTraining` as a semicolon-delimited
> string, and `priorTrainingList` as an array. Plain text takes the string with
> no fuss and never breaks when you add a program to `config.js`. A real
> multi-select column needs its choice values kept in exact sync with
> `priorTrainingOptions` — and a mismatch fails the entire flow run, not just
> that one field. If you want the multi-select anyway, map it from
> `outputs('Payload')?['priorTrainingList']` and accept the maintenance.

---

## Step 2 — Build the flow

New **Instant cloud flow** → trigger **"When an HTTP request is received."**

### 2a. Trigger

Leave the request body JSON schema **empty**. The page deliberately sends
`text/plain` (see the CORS note below), so the body arrives as a raw string and
a schema would not match it.

Set **Who can trigger the flow** to **Anyone** (in the trigger's Settings).

### 2b. Parse the body

Add a **Compose** action named exactly `Payload`:

```
json(triggerBody())
```

Everything downstream then reads `outputs('Payload')?['fieldName']`.

### 2c. Create the item

Add **SharePoint → Create item**, point it at `CCCPA Responses`, and map each
field. The left column is what you'll see in the Create item action; the right
is the expression to paste.

| SharePoint field | Expression |
|---|---|
| Title | `outputs('Payload')?['email']` |
| Email | `outputs('Payload')?['email']` |
| Name | `outputs('Payload')?['name']` |
| Timepoint | `outputs('Payload')?['timepoint']` |
| Unit | `outputs('Payload')?['unit']` |
| Role | `outputs('Payload')?['role']` |
| Years in role | `outputs('Payload')?['yearsExp']` |
| Prior training | `outputs('Payload')?['priorTraining']` |
| Prior training count | `outputs('Payload')?['priorTrainingCount']` |
| Any prior training | `outputs('Payload')?['anyPriorTraining']` |
| Training recency | `outputs('Payload')?['trainingRecency']` |
| Q1 … Q10 | `outputs('Payload')?['q1']` … `['q10']` |
| Total score | `outputs('Payload')?['totalScore']` |
| Mean score | `outputs('Payload')?['meanScore']` |
| Psychological mean | `outputs('Payload')?['psychMean']` |
| Physical mean | `outputs('Payload')?['physMean']` |
| Training mean | `outputs('Payload')?['trainMean']` |
| Submitted UTC | `outputs('Payload')?['submittedUtc']` |
| Timezone | `outputs('Payload')?['timezone']` |
| Client ID | `outputs('Payload')?['clientId']` |
| Form version | `outputs('Payload')?['formVersion']` |

If the list's **Title** column is required, mapping it to the email (as above)
keeps the list readable at a glance.

### 2d. Respond — this step is not optional

Add **Request → Response** as the last action:

- **Status Code:** `200`
- **Headers:**
  - `Access-Control-Allow-Origin` → `https://scottbrickner.github.io`
  - `Content-Type` → `application/json`
- **Body:** `{ "status": "ok" }`

Without that `Access-Control-Allow-Origin` header the row still lands in
SharePoint, but the browser blocks the page from reading the reply — so every
respondent sees a failure message for a submission that actually worked.

### 2e. Copy the URL

Save the flow, reopen the trigger, copy the **HTTP POST URL**.

---

## Step 3 — Wire it up

In `config.js`, set:

```js
endpoint: "https://prod-XX.westus.logic.azure.com:443/workflows/...",
```

Then:

```
git add config.js
git commit -m "Wire submission endpoint"
git push
```

The Pages workflow redeploys automatically. The "local-only mode" notice
disappears on its own once `endpoint` is non-empty.

**Test end to end:** open the live URL, submit a real response, confirm a row
appears in the list, then delete that test row.

---

## The CORS workaround, and why the page looks like it's doing something odd

The Power Automate HTTP trigger does not answer CORS **preflight** (`OPTIONS`)
requests. A normal `fetch` with `Content-Type: application/json` triggers a
preflight, gets no valid response, and the POST never fires.

The page therefore sends the JSON body with **no `Content-Type` header at all**.
The browser defaults to `text/plain;charset=UTF-8`, which is a "simple" content
type, so no preflight is issued and the POST goes straight through. That is why
the flow parses with `json(triggerBody())` instead of using a trigger schema.

Do not "fix" this by adding a `Content-Type` header to the fetch call. It will
break every submission.

---

## Security reality check

The flow URL contains its own access signature and sits in a public page's
`config.js`. Anyone who views source can see it and post to it.

That is the standard trade-off for this pattern and acceptable for an internal
self-assessment, but know what it means:

- Anyone on the internet can write rows to the list. Junk submissions are possible.
- The `@med.usc.edu` check runs **in the browser** and is trivially bypassed. It
  stops typos and wrong-address entries, not a determined actor.
- Want a speed bump? Put a `formKey` value in `config.js` and start the flow with
  a Condition that terminates unless `outputs('Payload')?['formKey']` matches.
  Still visible in source; still only a speed bump.

**If you need verified identity,** the page has to live inside the tenant
(SharePoint page, Power Apps, or Azure Static Web Apps with Entra auth) where
Entra ID authenticates the user. GitHub Pages is outside the tenant and
structurally cannot do this.

---

## Reporting

The pre/post analysis is a self-join on `Email`:

- **Change score** = Post `Total score` − Pre `Total score`, per person
- **Paired t-test or Wilcoxon** on those change scores for an abstract
- **Item-level means** pre vs post, to show *which* confidence domains moved

Because you're capturing prior training, two more cuts open up:

- **Baseline confidence by prior training** — CPI vs AVADE vs Welle vs none, on
  pre-training scores. The most interesting question in the dataset.
- **Change score by prior-training status** — whether naive staff gain more than
  previously-trained staff, i.e. whether your session is redundant for part of
  the room.

Sample sizes per program will be small and self-selected. Treat these as
descriptive and hypothesis-generating. Do not let anyone turn "AVADE scored
lower" into a procurement argument off n=9.

Watch for: post submissions with no matching pre (drop from paired analysis,
report separately), and duplicate submissions at the same timepoint (keep the
first; `Client ID` and `Submitted UTC` help you tell).
