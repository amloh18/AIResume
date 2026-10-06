// src/lib/utils/queue-eta.ts
var MAX_QUEUE_ETA_SECONDS = 30 * 60;
function formatQueueEta(etaSeconds) {
  if (etaSeconds < 60) return "under a minute";
  const minutes = Math.round(etaSeconds / 60);
  return `~${minutes} min`;
}

// src/lib/applications/live-progress.ts
var PHASE_BANDS = {
  saved: [0, 4],
  documents: [4, 40],
  queued: [40, 48],
  form_detection: [48, 58],
  field_fill: [58, 74],
  attachments: [74, 84],
  submitting: [84, 92],
  verification: [92, 99],
  applied: [100, 100],
  interview: [100, 100],
  offer: [100, 100],
  rejected: [100, 100]
};
var QUEUE_STALL_SECONDS = 5 * 60;
var PHASE_LABELS = {
  saved: "Saved",
  documents: "Preparing documents",
  queued: "Queued for submission",
  form_detection: "Finding the application form",
  field_fill: "Filling the application",
  attachments: "Attaching your documents",
  submitting: "Submitting application",
  verification: "Confirming submission",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Closed"
};
var PHASE_SUBSTEPS = {
  documents: [
    { key: "cv", label: "Tailoring your CV", status: "pending" },
    { key: "cover_letter", label: "Writing your cover letter", status: "pending" },
    { key: "ats", label: "Running the ATS check", status: "pending" }
  ],
  form_detection: [
    { key: "open", label: "Opening the posting", status: "pending" },
    { key: "ats", label: "Recognising the employer's site", status: "pending" },
    { key: "form", label: "Finding the application form", status: "pending" }
  ],
  field_fill: [
    { key: "details", label: "Filling your details", status: "pending" },
    { key: "questions", label: "Answering screening questions", status: "pending" }
  ],
  attachments: [
    { key: "cv", label: "Attaching your tailored CV", status: "pending" },
    { key: "cover_letter", label: "Attaching your cover letter", status: "pending" }
  ],
  submitting: [{ key: "submit", label: "Sending the application", status: "pending" }],
  verification: [
    { key: "confirm", label: "Reading the confirmation page", status: "pending" },
    { key: "email", label: "Watching for the confirmation email", status: "pending" }
  ]
};
function substepsFor(phase) {
  return (PHASE_SUBSTEPS[phase] || []).map((s) => ({ ...s }));
}
function withProgress(steps, activeKey, activeStatus = "active") {
  const index = steps.findIndex((s) => s.key === activeKey);
  if (index === -1) return steps;
  return steps.map((step, i) => {
    if (i < index) return { ...step, status: "completed" };
    if (i === index) return { ...step, status: activeStatus };
    return { ...step, status: "pending" };
  });
}
function allDone(steps) {
  return steps.map((s) => ({ ...s, status: "completed" }));
}
function percentInBand(phase, steps) {
  const [start, end] = PHASE_BANDS[phase];
  if (end <= start) return start;
  if (steps.length === 0) return start;
  const done = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
  const activeBonus = steps.some((s) => s.status === "active") ? 0.5 : 0;
  const ratio = Math.min(1, (done + activeBonus) / steps.length);
  return Math.round(start + (end - start) * ratio);
}
var MAYBE_ALREADY_SUBMITTED = /no confirmation evidence|needs manual verification/i;
var AWAITING_APPROVAL = /awaiting (your )?approval|approval before submission|held for your approval/i;
var MANUAL_HALT = /manual|not automatable|captcha|no application form/i;
var OPERATOR_WORDS = /\b(worker|WORKER_ROLE|cron|queue|playwright|puppeteer|selector|locator|stack|trace|env|environment|timeout|timed out|null|undefined|NaN|db|mongo|mongoose|redis|api|endpoint|status code|http|https|www)\b/i;
var OPERATOR_ERROR_CODE = /\bE[A-Z]{4,}\b/;
var SNAKE_CASE_TOKEN = /\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b/;
function sanitizeReason(reason) {
  const text = (reason || "").trim();
  if (!text) return void 0;
  if (text.length > 180) return void 0;
  if (!/^[A-Z]/.test(text)) return void 0;
  if (OPERATOR_WORDS.test(text)) return void 0;
  if (OPERATOR_ERROR_CODE.test(text)) return void 0;
  if (SNAKE_CASE_TOKEN.test(text)) return void 0;
  return text;
}
function deriveApplicationProgress(input) {
  const internal = (input.internalStatus || "").toLowerCase();
  const stage = (input.currentStage || "").toLowerCase();
  const legacyStatus = (input.status || "").toLowerCase();
  const journey = (input.journeyStatus || "").toLowerCase();
  const reason = input.reviewReason || "";
  const artifacts = input.artifacts || null;
  const updatedAt = input.updatedAt ? new Date(input.updatedAt).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
  const base2 = {
    applicationId: input.applicationId,
    jobId: input.jobId,
    eta: typeof input.queueEtaSeconds === "number" ? formatQueueEta(input.queueEtaSeconds) : void 0,
    queuePosition: input.queuePosition,
    updatedAt
  };
  const done = (phase, liveText, detail) => ({
    ...base2,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    liveText,
    detail,
    percent: 100,
    state: "done",
    substeps: allDone(substepsFor(phase)),
    isActive: false
  });
  if (stage === "rejected" || internal === "rejected") {
    return done("rejected", "This application was closed.", sanitizeReason(reason));
  }
  if (stage === "offer" || internal === "offer") {
    return done("offer", "You received an offer.", sanitizeReason(reason));
  }
  if (stage === "interview" || internal === "interview") {
    return done("interview", "You reached the interview stage.", sanitizeReason(reason));
  }
  if (stage === "applied" || internal === "applied") {
    return done(
      "applied",
      "Your application was submitted.",
      "Confirmation received. We are tracking replies in your inbox."
    );
  }
  if (internal === "review_required") {
    if (MAYBE_ALREADY_SUBMITTED.test(reason)) {
      return {
        ...base2,
        phase: "verification",
        phaseLabel: PHASE_LABELS.verification,
        liveText: "Submitted, but we could not confirm it.",
        detail: "Check the employer site and mark this applied if it went through. We will not re-submit automatically \u2014 that could apply twice.",
        percent: PHASE_BANDS.verification[0],
        state: "waiting_user",
        substeps: substepsFor("verification").map(
          (s) => s.key === "email" ? { ...s, status: "active" } : { ...s, status: "completed" }
        ),
        action: { id: "dismiss", label: "Take over" },
        isActive: true
      };
    }
    if (AWAITING_APPROVAL.test(reason)) {
      return {
        ...base2,
        phase: "queued",
        phaseLabel: "Ready to submit",
        liveText: "Documents ready \u2014 waiting for your approval.",
        detail: "Approve and your AI agent submits it for you. Nothing is sent without your say-so.",
        percent: PHASE_BANDS.queued[0],
        state: "waiting_user",
        substeps: [],
        action: { id: "approve", label: "Approve & submit" },
        isActive: true
      };
    }
    if (MANUAL_HALT.test(reason)) {
      return {
        ...base2,
        phase: "queued",
        phaseLabel: "Needs manual submission",
        liveText: "We can\u2019t submit this one automatically.",
        detail: sanitizeReason(reason) || "This employer\u2019s site needs a human. Open the posting, submit, then mark it applied so tracking stays accurate.",
        percent: PHASE_BANDS.queued[0],
        state: "waiting_user",
        substeps: [],
        action: { id: "dismiss", label: "Apply manually" },
        isActive: true
      };
    }
    return {
      ...base2,
      phase: "queued",
      phaseLabel: "Needs your action",
      liveText: "This application needs your input.",
      /*
        No curated fallback used to exist here, so a reason that failed
        sanitising left the customer with a bare sentence and a button and no
        idea what to do. The fallback is deliberately non-specific: the reason
        was unreadable, so inventing a cause would be worse than admitting we
        paused.
      */
      detail: sanitizeReason(reason) || "We paused here so nothing is submitted without you. Review it and continue when you are ready.",
      percent: PHASE_BANDS.queued[0],
      state: "waiting_user",
      substeps: [],
      action: { id: "dismiss", label: "Take over" },
      isActive: true
    };
  }
  if (internal === "automation_dismissed") {
    return {
      ...base2,
      phase: "queued",
      phaseLabel: "Manual submission",
      liveText: "Auto-Apply is off for this application.",
      detail: "Submit on the company site, then mark it applied so tracking stays accurate.",
      percent: PHASE_BANDS.queued[0],
      state: "waiting_user",
      substeps: [],
      isActive: true
    };
  }
  if (internal === "automation_failed" || input.deadLetter) {
    return {
      ...base2,
      phase: "submitting",
      phaseLabel: "Submission failed",
      liveText: "We could not submit this application.",
      detail: sanitizeReason(reason) || "Nothing was sent. You can retry, or apply from the job posting yourself.",
      percent: PHASE_BANDS.submitting[1],
      state: "failed",
      substeps: substepsFor("submitting").map((s) => ({ ...s, status: "failed" })),
      action: { id: "retry", label: "Retry" },
      isActive: true
    };
  }
  if (internal === "automation_unknown") {
    return {
      ...base2,
      phase: "verification",
      phaseLabel: PHASE_LABELS.verification,
      liveText: "We could not confirm this submission.",
      detail: "Check whether the application went out, then mark it applied or archive it. We will not retry blindly.",
      percent: PHASE_BANDS.verification[0],
      state: "waiting_user",
      substeps: substepsFor("verification").map((s) => ({ ...s, status: "pending" })),
      action: { id: "dismiss", label: "Take over" },
      isActive: true
    };
  }
  const docsReady = Boolean(input.hasCV) && Boolean(input.hasCoverLetter);
  const journeyRunning = ["processing_documents", "in-progress", "paused"].includes(journey);
  const journeyFailed = journey === "creation_failed";
  if (internal === "staging_cv_generating" || internal === "staging_cover_letter_generating") {
    const steps = substepsFor("documents");
    const activeKey = internal === "staging_cv_generating" ? "cv" : "cover_letter";
    const marked = withProgress(steps, activeKey);
    return {
      ...base2,
      phase: "documents",
      phaseLabel: PHASE_LABELS.documents,
      liveText: activeKey === "cv" ? "Tailoring your CV to this job\u2026" : "Writing your cover letter\u2026",
      percent: percentInBand("documents", marked),
      state: "running",
      substeps: marked,
      isActive: true
    };
  }
  if (internal === "staging_ready") {
    return {
      ...base2,
      phase: "queued",
      phaseLabel: "Ready to apply",
      liveText: "Your documents are ready.",
      detail: "Send it with Auto-Apply, or apply yourself.",
      percent: PHASE_BANDS.queued[0],
      state: "waiting_user",
      substeps: [],
      isActive: true
    };
  }
  if (journeyFailed) {
    const steps = substepsFor("documents").map((s) => ({ ...s, status: "failed" }));
    return {
      ...base2,
      phase: "documents",
      phaseLabel: "Document generation failed",
      liveText: "We could not generate your tailored documents.",
      percent: PHASE_BANDS.documents[0],
      state: "failed",
      substeps: steps,
      isActive: true
    };
  }
  if (!docsReady && journeyRunning) {
    const steps = substepsFor("documents");
    const activeKey = input.hasCV ? "cover_letter" : "cv";
    const marked = withProgress(steps, activeKey);
    return {
      ...base2,
      phase: "documents",
      phaseLabel: PHASE_LABELS.documents,
      liveText: input.hasCV ? "Writing your cover letter\u2026" : "Tailoring your CV to this job\u2026",
      percent: percentInBand("documents", marked),
      state: "running",
      substeps: marked,
      isActive: true
    };
  }
  const claimedByWorker = input.queueStatus === "processing";
  const sitsInQueue = internal === "queued" || input.queueStatus === "queued";
  if (sitsInQueue && !claimedByWorker) {
    const stalled = !claimedByWorker && typeof input.queuedForSeconds === "number" && input.queuedForSeconds >= QUEUE_STALL_SECONDS;
    const waitedSeconds = typeof input.queuedForSeconds === "number" ? input.queuedForSeconds : 0;
    const ahead = input.queuePosition && input.queuePosition > 1 ? input.queuePosition - 1 : 0;
    return {
      ...base2,
      phase: "queued",
      phaseLabel: PHASE_LABELS.queued,
      /*
        The customer is told it is working, in the product's voice, and is given
        a way out if they would rather not wait. "Queued for 12 min with no
        worker pickup" was an ops page rendered in a job card: it named an
        internal role, implied the product was broken, and gave the customer
        nothing to do. A slow queue and a dead queue now read the same to them —
        which is fine, because the difference is not theirs to act on.
      */
      liveText: stalled ? "Taking a little longer than usual\u2026" : ahead > 0 ? `Queued for Auto-Apply \u2014 ${ahead} ahead of you.` : "Queued for Auto-Apply\u2026",
      detail: stalled ? "No action needed \u2014 we\u2019ll submit this automatically as soon as it\u2019s ready. If you\u2019d rather not wait, you can apply from the job posting yourself." : base2.eta ? `Estimated start ${base2.eta}.` : "Nothing needed from you \u2014 this goes out automatically.",
      /*
        The operator still gets the real story, with the diagnosis and where to
        look. `diagnostic` is never rendered by any UI; it is for logs, telemetry
        and admin surfaces. Losing this would mean losing the only app-side
        signal that the queue is not being drained.
      */
      diagnostic: stalled ? {
        code: "queue_stalled",
        waitedSeconds,
        message: `Auto-Apply queue not draining: no agent claimed application ${input.applicationId} for ${Math.max(1, Math.round(waitedSeconds / 60))} min. Check WORKER_ROLE / the auto-apply cron on the server.`
      } : void 0,
      percent: PHASE_BANDS.queued[0],
      state: "running",
      stalled,
      substeps: [],
      isActive: true
    };
  }
  if (internal === "processing" || claimedByWorker) {
    const steps = withProgress(substepsFor("form_detection"), "open");
    return {
      ...base2,
      phase: "form_detection",
      phaseLabel: PHASE_LABELS.form_detection,
      liveText: "Opening the job posting\u2026",
      percent: percentInBand("form_detection", steps),
      state: "running",
      substeps: steps,
      isActive: true
    };
  }
  if (internal === "form_detected") {
    const fields = artifacts?.detectedFields || [];
    const audit = artifacts?.fillAudit;
    const filledAll = typeof audit?.filledFields === "number" && typeof audit?.totalFields === "number" && audit.totalFields > 0 && audit.filledFields >= audit.totalFields;
    if (filledAll) {
      const steps2 = withProgress(substepsFor("attachments"), "cv");
      return {
        ...base2,
        phase: "attachments",
        phaseLabel: PHASE_LABELS.attachments,
        liveText: "Attaching your CV and cover letter\u2026",
        percent: percentInBand("attachments", steps2),
        state: "running",
        substeps: steps2,
        isActive: true
      };
    }
    const atsLabel = artifacts?.atsType ? ` on ${prettyAts(artifacts.atsType)}` : "";
    const steps = fields.length > 0 ? fields.slice(0, 6).map((f, i) => ({
      key: `field_${i}`,
      label: f.label || "Field",
      status: f.filled ? "completed" : i === 0 ? "active" : "pending"
    })) : substepsFor("field_fill");
    return {
      ...base2,
      phase: "field_fill",
      phaseLabel: PHASE_LABELS.field_fill,
      liveText: fields.length ? `Filling ${fields.length} field${fields.length === 1 ? "" : "s"}${atsLabel}\u2026` : `Filling the application form${atsLabel}\u2026`,
      percent: percentInBand("field_fill", steps),
      state: "running",
      substeps: steps,
      isActive: true
    };
  }
  if (internal === "submitting") {
    const steps = withProgress(substepsFor("submitting"), "submit");
    return {
      ...base2,
      phase: "submitting",
      phaseLabel: PHASE_LABELS.submitting,
      liveText: "Submitting your application\u2026",
      percent: percentInBand("submitting", steps),
      state: "running",
      substeps: steps,
      isActive: true
    };
  }
  if (internal === "verification") {
    const steps = withProgress(substepsFor("verification"), "confirm");
    return {
      ...base2,
      phase: "verification",
      phaseLabel: PHASE_LABELS.verification,
      liveText: "Confirming your application was received\u2026",
      percent: percentInBand("verification", steps),
      state: "running",
      substeps: steps,
      isActive: true
    };
  }
  if (docsReady || stage === "staging" || legacyStatus === "created") {
    return {
      ...base2,
      phase: "queued",
      phaseLabel: "Ready to apply",
      liveText: "Documents ready \u2014 not submitted yet.",
      detail: "Choose AUTO, REVIEW or MANUAL to continue.",
      percent: PHASE_BANDS.queued[0],
      state: "waiting_user",
      substeps: [],
      isActive: true
    };
  }
  return {
    ...base2,
    phase: "saved",
    phaseLabel: PHASE_LABELS.saved,
    liveText: "Saved to your tracker.",
    percent: PHASE_BANDS.saved[1],
    state: "idle",
    substeps: [],
    isActive: false
  };
}
function prettyAts(ats) {
  const known = {
    greenhouse: "Greenhouse",
    lever: "Lever",
    ashby: "Ashby",
    workable: "Workable",
    workday: "Workday",
    naukri: "Naukri",
    indeed: "Indeed",
    adzuna: "Adzuna"
  };
  return known[ats.toLowerCase()] || ats;
}

// .verify/check-live-progress.ts
var failures = 0;
var checks = 0;
function check(name, actual, expected) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`\u2717 ${name}
    expected ${e}
    actual   ${a}`);
  } else {
    console.log(`\u2713 ${name}`);
  }
}
var base = { applicationId: "app1" };
check("saved row is idle", deriveApplicationProgress({ ...base, status: "saved" }).state, "idle");
check(
  "saved row shows no bar phase",
  deriveApplicationProgress({ ...base, status: "saved" }).phase,
  "saved"
);
var cvGen = deriveApplicationProgress({ ...base, internalStatus: "staging_cv_generating" });
check("cv generating \u2192 documents phase", cvGen.phase, "documents");
check("cv generating \u2192 running", cvGen.state, "running");
check(
  "cv generating \u2192 cv substep active",
  cvGen.substeps.find((s) => s.key === "cv")?.status,
  "active"
);
var clGen = deriveApplicationProgress({ ...base, internalStatus: "staging_cover_letter_generating" });
check(
  "cover letter generating \u2192 cover_letter active",
  clGen.substeps.find((s) => s.key === "cover_letter")?.status,
  "active"
);
check(
  "cover letter generating \u2192 cv already done",
  clGen.substeps.find((s) => s.key === "cv")?.status,
  "completed"
);
var ready = deriveApplicationProgress({ ...base, internalStatus: "staging_ready" });
check("staging_ready \u2192 waiting on user", ready.state, "waiting_user");
check("staging_ready \u2192 queued phase", ready.phase, "queued");
var queued = deriveApplicationProgress({
  ...base,
  internalStatus: "queued",
  queueEtaSeconds: 120,
  queuePosition: 2
});
check("queued \u2192 running", queued.state, "running");
check("queued \u2192 eta formatted", queued.eta, "~2 min");
check("queued live text names position", queued.liveText, "Queued for Auto-Apply \u2014 1 ahead of you.");
check(
  "processing \u2192 form detection",
  deriveApplicationProgress({ ...base, internalStatus: "processing" }).phase,
  "form_detection"
);
var filling = deriveApplicationProgress({ ...base, internalStatus: "form_detected" });
check("form_detected \u2192 field fill", filling.phase, "field_fill");
check("field fill is running", filling.state, "running");
var withFields = deriveApplicationProgress({
  ...base,
  internalStatus: "form_detected",
  artifacts: {
    atsType: "greenhouse",
    detectedFields: [
      { label: "First name", filled: true },
      { label: "Email", filled: true },
      { label: "Phone", filled: false }
    ],
    fillAudit: { totalFields: 3, filledFields: 1 }
  }
});
check("detected fields become substeps", withFields.substeps.length, 3);
check("live text names the ATS", withFields.liveText.includes("Greenhouse"), true);
var attached = deriveApplicationProgress({
  ...base,
  internalStatus: "form_detected",
  artifacts: { fillAudit: { totalFields: 3, filledFields: 3 } }
});
check("all fields filled \u2192 attachments phase", attached.phase, "attachments");
check(
  "submitting phase",
  deriveApplicationProgress({ ...base, internalStatus: "submitting" }).phase,
  "submitting"
);
check(
  "verification phase",
  deriveApplicationProgress({ ...base, internalStatus: "verification" }).phase,
  "verification"
);
var applied = deriveApplicationProgress({ ...base, internalStatus: "applied", currentStage: "applied" });
check("applied \u2192 done", applied.state, "done");
check("applied \u2192 100%", applied.percent, 100);
check("applied \u2192 not active", applied.isActive, false);
check(
  "rejected \u2192 closed",
  deriveApplicationProgress({ ...base, internalStatus: "rejected" }).phase,
  "rejected"
);
var approve = deriveApplicationProgress({
  ...base,
  internalStatus: "review_required",
  reviewReason: "Review mode: documents prepared and held for your approval before submission."
});
check("approval park \u2192 waiting on user", approve.state, "waiting_user");
check("approval park \u2192 offers approve", approve.action?.id, "approve");
var manual = deriveApplicationProgress({
  ...base,
  internalStatus: "review_required",
  reviewReason: "No application form detected at https://careers.airbnb.com/positions/8232474."
});
check("no-form park \u2192 offers manual take-over", manual.action?.id, "dismiss");
check("no-form park \u2192 names the halt", manual.liveText, "We can\u2019t submit this one automatically.");
check("no-form park \u2192 a URL-bearing reason is dropped", manual.detail?.includes("http"), false);
check("no-form park \u2192 falls back to curated copy", manual.detail?.includes("needs a human"), true);
var failed = deriveApplicationProgress({ ...base, internalStatus: "automation_failed" });
check("failed \u2192 failed state", failed.state, "failed");
check("failed \u2192 offers retry", failed.action?.id, "retry");
var unknown = deriveApplicationProgress({ ...base, internalStatus: "automation_unknown" });
check("unknown \u2192 waiting on user", unknown.state, "waiting_user");
check("unknown \u2192 never offers a blind retry", unknown.action?.id, "dismiss");
var order = [
  "staging_cv_generating",
  "staging_cover_letter_generating",
  "staging_ready",
  "queued",
  "processing",
  "form_detected",
  "submitting",
  "verification",
  "applied"
].map((s) => deriveApplicationProgress({ ...base, internalStatus: s }).percent);
var monotonic = true;
for (let i = 1; i < order.length; i++) {
  if (order[i] < order[i - 1]) monotonic = false;
}
check("percent never moves backwards", monotonic, true);
check("percent stays within 0..100", order.every((p) => p >= 0 && p <= 100), true);
var journeyOnly = deriveApplicationProgress({
  ...base,
  internalStatus: "saved",
  journeyStatus: "processing_documents",
  hasCV: true
});
check("journey generating \u2192 documents phase", journeyOnly.phase, "documents");
check("journey generating \u2192 cover letter next", journeyOnly.liveText, "Writing your cover letter\u2026");
var brieflyQueued = deriveApplicationProgress({
  ...base,
  internalStatus: "queued",
  queueStatus: "queued",
  queuedForSeconds: 60
});
check("a short queue wait is not a stall", brieflyQueued.stalled, false);
check("a short queue wait reads as queued", brieflyQueued.liveText, "Queued for Auto-Apply\u2026");
check("a queued row carries no operator diagnostic", brieflyQueued.diagnostic, void 0);
var waitingBehind = deriveApplicationProgress({
  ...base,
  internalStatus: "queued",
  queueStatus: "queued",
  queuedForSeconds: 30,
  queuePosition: 4
});
check(
  "queue position is phrased for a human",
  waitingBehind.liveText,
  "Queued for Auto-Apply \u2014 3 ahead of you."
);
var stalledQueue = deriveApplicationProgress({
  ...base,
  internalStatus: "queued",
  queueStatus: "queued",
  queuedForSeconds: 12 * 60
});
check("a long queue wait is still flagged for operators", stalledQueue.stalled, true);
check('a stall is still "in flight"', stalledQueue.isActive, true);
check(
  "a stall reads calmly to the customer",
  stalledQueue.liveText,
  "Taking a little longer than usual\u2026"
);
check("a stall reassures instead of alarming", stalledQueue.detail?.includes("No action needed"), true);
check("a stall still offers a way out", stalledQueue.detail?.includes("apply from the job posting"), true);
check("a stall carries the operator diagnosis", stalledQueue.diagnostic?.code, "queue_stalled");
check(
  "the diagnosis names the internal cause",
  stalledQueue.diagnostic?.message.includes("WORKER_ROLE"),
  true
);
check("the diagnosis reports the wait", stalledQueue.diagnostic?.waitedSeconds, 12 * 60);
check("the diagnosis never reaches liveText", stalledQueue.liveText.includes("WORKER_ROLE"), false);
check("the diagnosis never reaches detail", stalledQueue.detail?.includes("WORKER_ROLE"), false);
check("the diagnosis never reaches detail (cause)", stalledQueue.detail?.includes("draining"), false);
var processingStall = deriveApplicationProgress({
  ...base,
  internalStatus: "queued",
  queueStatus: "processing",
  queuedForSeconds: 12 * 60
});
check("a claimed row is never flagged as stalled", processingStall.stalled ?? false, false);
check(
  "a claimed row advances to form detection",
  processingStall.phase,
  "form_detection"
);
var rawOperatorReason = deriveApplicationProgress({
  ...base,
  internalStatus: "automation_failed",
  reviewReason: "playwright selector #submit not found after 30000ms"
});
check(
  "a raw operator reason is dropped",
  rawOperatorReason.detail?.includes("playwright") ?? false,
  false
);
check(
  "a dropped reason falls back to curated copy",
  rawOperatorReason.detail?.includes("Nothing was sent"),
  true
);
var snakeReason = deriveApplicationProgress({
  ...base,
  internalStatus: "review_required",
  reviewReason: "automation_unknown_no_confirmation"
});
check(
  "a snake_case reason is dropped",
  snakeReason.detail?.includes("automation_unknown") ?? false,
  false
);
check(
  "a dropped snake_case reason falls back to curated copy",
  snakeReason.detail?.includes("nothing is submitted without you"),
  true
);
var fragmentReason = deriveApplicationProgress({
  ...base,
  internalStatus: "review_required",
  reviewReason: "no application form detected"
});
check(
  "a log fragment is dropped",
  fragmentReason.detail?.includes("no application form") ?? false,
  false
);
var cleanReason = deriveApplicationProgress({
  ...base,
  internalStatus: "review_required",
  reviewReason: "The employer asks for a portfolio link."
});
check("a clean sentence is kept", cleanReason.detail, "The employer asks for a portfolio link.");
var OPERATOR_VOCABULARY = /\b(worker|WORKER_ROLE|cron|playwright|puppeteer|selector|locator|draining|stack trace|ENOENT|ECONN|mongoose|redis|env var|auto-apply queue)\b/i;
var everyStatus = [
  {},
  { status: "saved" },
  { currentStage: "staging", status: "created" },
  { internalStatus: "staging_cv_generating" },
  { internalStatus: "staging_cover_letter_generating" },
  { internalStatus: "staging_ready" },
  { internalStatus: "queued", queueStatus: "queued", queuedForSeconds: 10 },
  { internalStatus: "queued", queueStatus: "queued", queuedForSeconds: 10, queuePosition: 3 },
  { internalStatus: "queued", queueStatus: "queued", queuedForSeconds: 12 * 60 },
  { internalStatus: "queued", queueStatus: "processing" },
  { internalStatus: "processing" },
  { internalStatus: "form_detected" },
  { internalStatus: "form_detected", artifacts: { atsType: "greenhouse" } },
  {
    internalStatus: "form_detected",
    artifacts: {
      atsType: "greenhouse",
      detectedFields: [{ label: "Email", filled: true }],
      fillAudit: { totalFields: 3, filledFields: 3 }
    }
  },
  { internalStatus: "submitting" },
  { internalStatus: "verification" },
  { internalStatus: "applied" },
  { internalStatus: "interview" },
  { internalStatus: "offer" },
  { internalStatus: "rejected" },
  { internalStatus: "review_required", reviewReason: "Awaiting approval before submission" },
  { internalStatus: "review_required", reviewReason: "captcha present" },
  { internalStatus: "review_required", reviewReason: "no application form detected" },
  { internalStatus: "review_required", reviewReason: "no confirmation evidence found" },
  { internalStatus: "review_required", reviewReason: "something else entirely" },
  { internalStatus: "automation_dismissed" },
  { internalStatus: "automation_failed" },
  { internalStatus: "automation_failed", deadLetter: true },
  { internalStatus: "automation_unknown" },
  { journeyStatus: "creation_failed" },
  { journeyStatus: "processing_documents", hasCV: true }
];
var leaked = [];
for (const input of everyStatus) {
  const p = deriveApplicationProgress({ ...base, ...input });
  const visible = [
    p.liveText,
    p.detail,
    p.phaseLabel,
    ...p.substeps.map((s) => s.label),
    ...p.action ? [p.action.label] : []
  ];
  for (const text of visible) {
    if (text && OPERATOR_VOCABULARY.test(text)) {
      leaked.push(`"${text}"`);
    }
  }
}
check("no status leaks operator vocabulary into customer copy", leaked, []);
console.log(`
${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
