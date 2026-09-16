/* ------------------------------------------------------------------
   CCCPA Self-Assessment — deployment configuration
   Edit this file only. index.html reads everything from here.
   ------------------------------------------------------------------ */
window.CCCPA_CONFIG = {

  /* ------------------------------------------------------------------
     FormSubmit.co delivery
     ------------------------------------------------------------------
     PHASE 1 — put your raw email here, deploy, and submit the form once.
     FormSubmit emails you a one-time "Activate Form" confirmation.
     PHASE 2 — after activating, replace this with the random form ID
     FormSubmit gives you, so your address is not sitting in the public
     page source. The value is the only thing that changes.

     Leave as "" to run in LOCAL-ONLY mode (scores + CSV download,
     nothing transmitted) — useful for piloting. */
  formSubmitId: "82b5afae35bdfa8b7efe6a40c50a7745",

  /* true  = https://formsubmit.co/ajax/<id>   (no captcha, no page nav)
     false = https://formsubmit.co/<id>        (native POST, captcha screen)

     Keep this true. false is only needed for _autoresponse, which this
     survey deliberately does not use: the respondent already sees their
     score on screen, and the captcha interstitial is exactly the friction
     the QR-code workflow was built to avoid. */
  formSubmitAjax: true,

  /* Subject line of each notification email. Person first, timepoint last,
     so sorting your inbox by subject puts each respondent's PRE and POST
     next to each other — that adjacency is the pairing operation.
     Tokens: {email} {localpart} {timepoint} {unit} {role} {name} */
  emailSubject: "CCCPA \u2014 {localpart} \u2014 {timepoint}",

  /* Email domains accepted by the respondent ID field. */
  allowedEmailDomains: ["med.usc.edu", "usc.edu"],

  /* Header text. */
  orgName: "Keck Medicine of USC",
  programName: "Nursing Professional Development",

  /* Timepoint options.
     v1 of this study is PRE-ONLY: the intervention has not been defined yet,
     so there is nothing to be "post" of. The later timepoints are shown but
     disabled so respondents can see the design, and so re-opening them later
     is a one-word edit (delete `disabled: true`) rather than a schema change.
     The SharePoint Timepoint column is plain text, so nothing downstream
     needs to change when they open. */
  timepoints: [
    "Pre-training",
    { value: "Post-training",    disabled: true },
    { value: "30-day follow-up", disabled: true }
  ],

  /* Prior formal workplace violence prevention / de-escalation training.
     Add or remove programs to match what your staff have actually taken.
     The "none" option is appended automatically and is mutually exclusive. */
  priorTrainingOptions: [
    "CPI / Nonviolent Crisis Intervention",
    "AVADE",
    "Welle",
    "MOAB (Management of Aggressive Behavior)",
    "Other"
  ],
  noPriorTrainingLabel: "No prior formal training",

  /* How long ago the most recent of those trainings was. */
  trainingRecencyOptions: [
    "Within the past 12 months",
    "1\u20132 years ago",
    "3\u20135 years ago",
    "More than 5 years ago"
  ],

  /* Unit / practice area.
     Sourced from "KHS - Inpatient and Periop Staff with User Details"
     (active staff only). Strings match the roster's Department field
     EXACTLY so responses join cleanly to staffing data later -- note it is
     "ICU Float Pool", not "Float Pool ICU".

     Scoped 2026-09-16 to direct-care inpatient only: 21 units, ~1,248
     active staff. Deliberately excluded -- Periop Float Pool and all 12
     periop/procedural areas (Surgery, PACU, endo, IR, pre/post-op, day
     hospital), and the two non-direct-care departments (Nursing Admin,
     Inservice Education -- the latter being the WPV lead's own department).
     There is no Emergency Department in this roster; it is inpatient and
     periop only.

     An entry is a plain string, or {label, options:[...]} for a group. */
  units: [
    { label: "Float pool", options: [
      "ICU Float Pool",
      "Float Pool"
    ]},
    { label: "Critical care", options: [
      "4 S ICU", "7 S ICU", "5 W ICU", "8 W Med ICU",
      "7 W ICU", "7 E ICU", "5 S ICU", "4 Fl ICU"
    ]},
    { label: "Stepdown / telemetry", options: [
      "6 EW MedSurg Stepdown", "6 S Tele", "7 N Tele", "5 N Tele",
      "9 EW Surgical Telemetry", "2 EW Tele", "5 E Tele", "8 E Tele"
    ]},
    { label: "Med-surg / hem-onc", options: [
      "3 Fl HemOnc-BMT", "4 Fl HemOnc-BMT", "6 N Med-Surg"
    ]},
    "Other"
  ],

  /* Pre-selected values. A defaulted field opens already answered, which
     saves a tap for the majority case but means anyone who does not look
     submits the default. Justified while the study population IS the ICU
     float pool; delete this entry if you extend to broader RN/CNA groups. */
  fieldDefaults: {
    unit: "ICU Float Pool",
    timepoint: "Pre-training"
  },

  /* Short explanatory line under a field's label. */
  fieldNotes: {
    timepoint: "Baseline only for now \u2014 post-training and follow-up open once the education intervention is defined."
  },

  /* Roles. Set to [] to hide. */
  roles: ["RN", "Charge RN", "Nurse Practitioner", "PCT / CNA",
          "Respiratory Therapist", "Provider", "Other"],

  /* Show the respondent their own score after submitting. */
  showScoreToRespondent: true,

  /* Show the descriptive (NOT psychometrically validated) item
     groupings on the results screen. */
  showDescriptiveGroupings: true
};
