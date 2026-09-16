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
  formSubmitId: "scott.brickner2@med.usc.edu",

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

  /* Timepoint options for pre/post administration. */
  timepoints: ["Pre-training", "Post-training", "30-day follow-up"],

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

  /* Optional practice-area picker. Set to [] to hide. */
  units: [
    "CTICU", "MICU", "SICU", "Neuro ICU", "CCU",
    "Stepdown / PCU", "Emergency Department",
    "Medical-Surgical", "Float Pool", "Other"
  ],

  /* Roles. Set to [] to hide. */
  roles: ["RN", "Charge RN", "Nurse Practitioner", "PCT / CNA",
          "Respiratory Therapist", "Provider", "Other"],

  /* Show the respondent their own score after submitting. */
  showScoreToRespondent: true,

  /* Show the descriptive (NOT psychometrically validated) item
     groupings on the results screen. */
  showDescriptiveGroupings: true
};
