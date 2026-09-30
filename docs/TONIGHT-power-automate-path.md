# Tonight: a delivery path that doesn't depend on FormSubmit

FormSubmit is returning 500 to every POST and there is no ETA. This builds a second,
tenant-native path so tomorrow does not depend on someone else's server coming back.

**Your part is about 20 minutes.** The page is already patched and committed — it posts
to both paths and counts a response as delivered if *either* lands. `flowUrl` is empty,
so nothing changes until you paste the URL in.

---

## Step 1 — create the flow (3 min)

Power Automate → the **`Brickner, Scott`** environment (same one as `CCCPA → SharePoint`)
→ **Create** → **Instant cloud flow** → name it `CCCPA HTTP → SharePoint` → trigger
**When an HTTP request is received** → Create.

Leave the request body schema **empty**. Save. Reopen the trigger and copy the
**HTTP POST URL** — it only appears after the first save.

> That URL is a public, unauthenticated write endpoint. Anyone who reads the page source
> can post to it. Step 3 adds a shared-secret check, which stops drive-by junk and is not
> a security boundary. Nothing sensitive goes in this list.

**Send me the URL** and I'll put it in `config.js`.

---

## Step 2 — normalize the body (2 min)

Add a **Compose**, name it exactly `Payload`. Expression:

```
json(triggerBody())
```

Power Automate sometimes hands a text/plain body over as a wrapper object instead of a
string. If your first test shows that, swap the expression for:

```
json(base64ToString(triggerBody()?['$content']))
```

You will know which within one test run — step 5 says how to tell.

---

## Step 3 — drop anything that isn't us (2 min)

Add a **Condition**:

- Left: `outputs('Payload')?['formVersion']`
- **is equal to**
- Right: the value your page sends in `formVersion`

Put everything below in the **If yes** branch. Leave **If no** empty — junk posts end
there and do nothing.

---

## Step 4 — write the row in ONE action (5 min)

Do **not** use *Create item* — it means 29 separate fields in the picker. Use
**Send an HTTP request to SharePoint** instead: one paste, and it addresses the list's
internal column names directly.

| Field | Value |
|---|---|
| Site Address | the site holding **CCCPA Responses** |
| Method | `POST` |
| Uri | `_api/web/lists/getbytitle('CCCPA Responses')/items` |
| Headers | `Accept` = `application/json;odata=nometadata` · `Content-Type` = `application/json;odata=nometadata` |

Body — paste whole. The list came from the Excel import, so its internal names are
`Title` plus `field_1`…`field_28`, in the same order as the page's own column list:

```json
{
  "Title":    "@{outputs('Payload')?['submittedUtc']}",
  "field_1":  "@{outputs('Payload')?['email']}",
  "field_2":  "@{outputs('Payload')?['name']}",
  "field_3":  "@{outputs('Payload')?['timepoint']}",
  "field_4":  "@{outputs('Payload')?['unit']}",
  "field_5":  "@{outputs('Payload')?['role']}",
  "field_6":  "@{outputs('Payload')?['yearsExp']}",
  "field_7":  "@{outputs('Payload')?['priorTraining']}",
  "field_8":  "@{outputs('Payload')?['priorTrainingCount']}",
  "field_9":  "@{outputs('Payload')?['anyPriorTraining']}",
  "field_10": "@{outputs('Payload')?['trainingRecency']}",
  "field_11": "@{outputs('Payload')?['totalScore']}",
  "field_12": "@{outputs('Payload')?['meanScore']}",
  "field_13": "@{outputs('Payload')?['psychMean']}",
  "field_14": "@{outputs('Payload')?['physMean']}",
  "field_15": "@{outputs('Payload')?['trainMean']}",
  "field_16": "@{outputs('Payload')?['q1']}",
  "field_17": "@{outputs('Payload')?['q2']}",
  "field_18": "@{outputs('Payload')?['q3']}",
  "field_19": "@{outputs('Payload')?['q4']}",
  "field_20": "@{outputs('Payload')?['q5']}",
  "field_21": "@{outputs('Payload')?['q6']}",
  "field_22": "@{outputs('Payload')?['q7']}",
  "field_23": "@{outputs('Payload')?['q8']}",
  "field_24": "@{outputs('Payload')?['q9']}",
  "field_25": "@{outputs('Payload')?['q10']}",
  "field_26": "@{outputs('Payload')?['timezone']}",
  "field_27": "@{outputs('Payload')?['clientId']}",
  "field_28": "@{outputs('Payload')?['formVersion']}"
}
```

> If your list's internal names are not `field_N`, open the list → **Settings** →
> click any column and read `Field=` at the end of the address bar. Tell me and I will
> regenerate the body.

---

## Step 5 — answer the browser (3 min)

Add **Response** as the last action in the **If yes** branch.

| Field | Value |
|---|---|
| Status Code | `200` |
| Headers | `Access-Control-Allow-Origin` = `*` |
| Body | `{"ok":true}` |

**This action is what makes the difference.** Without it the browser cannot read the
result and you are back to the exact blindness FormSubmit put you in tonight.

Save. Then **Test → Manually → Run flow**, and post anything to the URL. Open the run:

- **Trigger → raw outputs** shows what arrived. If you see a `$content` field with a
  base64 blob rather than your JSON, switch the `Payload` expression to the second one
  in step 2.
- Then check the row landed in **CCCPA Responses**.

---

## Step 6 — turn it on

Send me the flow URL. I'll set `flowUrl` in `config.js` and hand it back; you push, and
Pages redeploys in about a minute. Then we submit one real response end to end and watch
the row appear.

---

## What tomorrow looks like after this

- FormSubmit still down → the flow catches every response. Nobody notices.
- FormSubmit comes back → both fire; you get the email *and* the row. Worth knowing:
  that means a **duplicate row** once the old email-trigger flow also runs. `clientId`
  and `submittedUtc` make duplicates easy to spot, and the cleanest fix after tomorrow
  is to turn the old email flow off and keep the email purely as a backup copy.
- Both down → the response still queues in the respondent's browser, exactly as now.

## If you run out of time tonight

Stop after step 1 and send me the URL. A flow with only a trigger and the
*Send an HTTP request to SharePoint* action — no condition, no Response — still writes
rows. The Response action only buys you an honest success message on screen. Skipping
it means the page says "saved on this device" while the row lands fine.

---

## Replacing FormSubmit outright

The flow above *is* the replacement. Once it works, FormSubmit is a backup you can keep
or delete. For completeness, the realistic field:

| Option | Verdict |
|---|---|
| **Power Automate HTTP trigger → SharePoint** *(tonight)* | **The answer.** Inside the tenant, no relay, no email hop, no retention gap, and the browser gets a real confirmation. Costs: the trigger URL is public and unauthenticated (shared-secret check mitigates), and the Request trigger plus Response action are premium. |
| **Microsoft Forms** | Boring and bulletproof: authenticated, governed, results land in Excel automatically, nothing to maintain. The 11-point scale can't be a Likert grid — Forms caps those at 7 columns — but ten separate choice questions with options 1–11 works. Loses the design, the score-on-screen, and the QR-to-page feel. Keep this as the escape hatch if the flow is blocked. |
| **Azure Static Web Apps + Entra auth** | The correct long-term answer if this grows into real research. Needs IT and a timeline you do not have. |
| **Another relay** — Formspree, Web3Forms, Basin, Getform | Swaps one free third party with no SLA for another. Formspree at least publishes a status page. Solves nothing structural; you would be doing this again. |
| **SharePoint REST straight from the page** | Not possible. Needs an authenticated context, and CORS blocks it from a github.io origin. |
| **Google Forms / Apps Script** | Staff data leaving the tenant. Don't. |

**The one thing that could block tonight:** the *When an HTTP request is received* trigger
and the *Response* action are premium. You have built an HTTP-trigger flow before, so the
licensing is probably there — but if step 1 refuses, stop and say so, and we fall back to
Microsoft Forms for tomorrow rather than burning the evening.
