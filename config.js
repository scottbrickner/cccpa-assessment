/* ------------------------------------------------------------------
   CCCPA Self-Assessment — deployment configuration
   Edit this file only. index.html reads everything from here.
   ------------------------------------------------------------------ */
window.CCCPA_CONFIG = {

  /* Paste the "HTTP POST URL" from your Power Automate
     "When an HTTP request is received" trigger here.
     Leave as "" to run the page in LOCAL-ONLY mode (scores + CSV
     download, nothing transmitted). Useful for piloting. */
  endpoint: "",

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
