const STORAGE_KEY = "dueproof-obligations";

const captureInput = document.querySelector("#captureInput");
const categoryInput = document.querySelector("#categoryInput");
const ownerInput = document.querySelector("#ownerInput");
const manualDateInput = document.querySelector("#manualDateInput");
const manualAmountInput = document.querySelector("#manualAmountInput");
const reminderInput = document.querySelector("#reminderInput");
const analyzeButton = document.querySelector("#analyzeButton");
const clearButton = document.querySelector("#clearButton");
const seedButton = document.querySelector("#seedButton");
const exportButton = document.querySelector("#exportButton");
const copyBriefButton = document.querySelector("#copyBriefButton");
const enableNotificationsButton = document.querySelector("#enableNotificationsButton");
const filterInput = document.querySelector("#filterInput");
const searchInput = document.querySelector("#searchInput");
const obligationList = document.querySelector("#obligationList");
const moneyList = document.querySelector("#moneyList");
const missionList = document.querySelector("#missionList");
const vaultList = document.querySelector("#vaultList");
const messageList = document.querySelector("#messageList");
const briefCard = document.querySelector("#briefCard");
const todayCount = document.querySelector("#todayCount");
const moneyAtRisk = document.querySelector("#moneyAtRisk");
const highestRisk = document.querySelector("#highestRisk");
const resolvedCount = document.querySelector("#resolvedCount");
const missingProofCount = document.querySelector("#missingProofCount");
const installButton = document.querySelector("#installButton");
const template = document.querySelector("#obligationTemplate");

const demoItems = [
  {
    text: "Your storage subscription renews on May 4 for $119.99. Cancel before May 2 to avoid the annual charge. Account ID ST-8291.",
    category: "subscription",
    owner: "Me",
  },
  {
    text: "Reminder: dental appointment for Sam on May 1 at 3:30 PM. Bring insurance card and arrive 15 minutes early.",
    category: "appointment",
    owner: "Family",
  },
  {
    text: "Return window closes May 6 for order #A8821. Refund amount $64.50. Item must be shipped with original label.",
    category: "return",
    owner: "Home",
  },
  {
    text: "Your rent payment of $1,850 is due on May 3. A $75 late fee applies after May 5.",
    category: "housing",
    owner: "Home",
  },
];

const templates = {
  subscription: "My plan renews on May 12 for $89.99. Cancel before May 9 to avoid the charge. Account ID ABC-1234.",
  return: "Return window closes May 18 for order #R4821. Refund amount $64.50. Item must be shipped with the original label.",
  bill: "Payment of $240 is due on May 10. A late fee applies after May 12. Invoice INV-3009.",
  school: "School permission form is due May 6. Parent signature and insurance info required.",
  invoice: "Client invoice INV-1042 for $1,200 is due May 15. Follow up if unpaid.",
  travel: "Passport appointment on May 20. Bring photo ID, passport photo, old passport, and payment.",
};

const personaExamples = {
  family: "School form due May 6. Parent signature, lunch payment of $28, and emergency contact update required.",
  student: "Housing deposit of $500 is due May 14. Submit lease documents and student ID before the deadline.",
  caregiver: "Insurance renewal notice for Dad is due May 22. Premium is $310. Need policy number and doctor list.",
  freelancer: "Client invoice INV-2098 for $1,750 is due May 17. Send follow-up if unpaid after due date.",
};

function loadItems() {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map(normalizeItem);
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function normalizeItem(item) {
  return {
    ...item,
    reminderDays: Number(item.reminderDays ?? 3),
    scamSignals: item.scamSignals || detectScamSignals(item.rawText || item.summary || ""),
    missingInfo: item.missingInfo || findMissingInfo(item.rawText || item.summary || "", item.category || "work"),
    checklist: item.checklist || makeChecklist(item.category || "work"),
    messageDraft: item.messageDraft || makeMessageDraft(item.category || "work", item.title || "this item", item.deadline, item.amount || 0),
  };
}

function parseItem(text, selectedCategory, owner, overrides = {}) {
  const detectedCategory = selectedCategory === "auto" ? detectCategory(text) : selectedCategory;
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const deadline = overrides.deadline || dates[0] || null;
  const amount = Number.isFinite(overrides.amount) ? overrides.amount : amounts[0] || 0;
  const risk = calculateRisk(text, deadline, amount, detectedCategory);
  const title = makeTitle(text, detectedCategory);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title,
    rawText: text.trim(),
    summary: summarize(text, detectedCategory),
    category: detectedCategory,
    owner,
    deadline,
    amount,
    reference: extractReference(text),
    risk,
    status: "open",
    reminderDays: Number(overrides.reminderDays ?? 3),
    scamSignals: detectScamSignals(text),
    actionPlan: makeActionPlan(text, detectedCategory, deadline, amount),
    missingInfo: findMissingInfo(text, detectedCategory),
    checklist: makeChecklist(detectedCategory),
    messageDraft: makeMessageDraft(detectedCategory, title, deadline, amount),
  };
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes("cancel") || lower.includes("subscription") || lower.includes("renews")) return "subscription";
  if (lower.includes("refund") || lower.includes("return")) return "return";
  if (lower.includes("rent") || lower.includes("landlord") || lower.includes("lease")) return "housing";
  if (lower.includes("appointment") || lower.includes("doctor") || lower.includes("dentist")) return "appointment";
  if (lower.includes("school") || lower.includes("teacher") || lower.includes("permission")) return "school";
  if (lower.includes("flight") || lower.includes("passport") || lower.includes("visa")) return "travel";
  if (lower.includes("invoice") || lower.includes("payment") || lower.includes("due")) return "bill";
  return "work";
}

function extractDates(text) {
  const explicitDates = [...text.matchAll(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/gi)].map((match) => {
    const date = new Date(`${match[0]}, ${new Date().getFullYear()}`);
    if (date < startOfToday()) date.setFullYear(date.getFullYear() + 1);
    return date.toISOString();
  });

  const relative = [];
  if (/\btoday\b/i.test(text)) relative.push(new Date().toISOString());
  if (/\btomorrow\b/i.test(text)) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    relative.push(date.toISOString());
  }

  return [...explicitDates, ...relative].sort((a, b) => new Date(a) - new Date(b));
}

function extractAmounts(text) {
  return [...text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/g)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((amount) => Number.isFinite(amount));
}

function extractReference(text) {
  const match = text.match(/\b(?:ref(?:erence)?|account|order|invoice|id|#)\s*[:#-]?\s*([A-Z0-9-]{4,})\b/i);
  return match ? match[1] : "";
}

function calculateRisk(text, deadline, amount, category) {
  let score = 0;
  const lower = text.toLowerCase();
  const days = deadline ? daysUntil(deadline) : 10;

  if (deadline) score += days <= 1 ? 5 : days <= 3 ? 4 : days <= 7 ? 3 : 1;
  if (amount >= 500) score += 4;
  else if (amount >= 100) score += 3;
  else if (amount > 0) score += 1;
  if (/(late fee|avoid charge|expires|final notice|urgent|cancel before|past due)/i.test(lower)) score += 3;
  if (["housing", "travel", "bill"].includes(category)) score += 1;

  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function makeTitle(text, category) {
  const labels = {
    subscription: "Subscription renewal",
    return: "Return or refund deadline",
    housing: "Housing obligation",
    appointment: "Appointment reminder",
    school: "School or family form",
    travel: "Travel document task",
    bill: "Bill or payment task",
    work: "Admin task",
  };
  const firstSentence = text.split(/[.!?]/)[0].trim();
  return firstSentence.length < 55 ? firstSentence : labels[category];
}

function summarize(text, category) {
  const clean = text.trim().replace(/\s+/g, " ");
  const categoryText = category.replace("-", " ");
  return `${categoryText}: ${clean.length > 150 ? `${clean.slice(0, 150)}...` : clean}`;
}

function makeActionPlan(text, category, deadline, amount) {
  const actions = {
    subscription: "Decide whether to keep it, then cancel or renegotiate before the renewal deadline.",
    return: "Pack the item, confirm the return label, and ship before the return window closes.",
    housing: "Pay or respond before the deadline, and save proof of payment or communication.",
    appointment: "Confirm attendance, gather required documents, and set a leave-now reminder.",
    school: "Find missing signatures or documents, then submit before the school deadline.",
    travel: "Verify required documents, names, dates, and expiration rules before travel.",
    bill: "Confirm the amount, due date, and payment method before late fees apply.",
    work: "Clarify the owner, deadline, and expected output, then send a confirmation reply.",
  };

  const moneyText = amount ? ` Money involved: ${formatCurrency(amount)}.` : "";
  const dateText = deadline ? ` Deadline: ${formatDate(deadline)}.` : " Add a deadline when you know it.";
  return `${actions[category] || actions.work}${dateText}${moneyText}`;
}

function findMissingInfo(text, category) {
  const missing = [];
  if (!extractDates(text).length) missing.push("deadline");
  if (!extractReference(text)) missing.push("reference number");
  if (["bill", "subscription", "return", "housing"].includes(category) && !extractAmounts(text).length) missing.push("amount");
  if (!/(call|email|website|link|phone|contact)/i.test(text)) missing.push("contact method");
  return missing;
}

function detectScamSignals(text) {
  const signals = [];
  if (/(gift card|wire transfer|crypto|bitcoin|zelle|cash app)/i.test(text)) signals.push("risky payment method");
  if (/(act now|immediately|final warning|account locked|verify now)/i.test(text)) signals.push("pressure language");
  if (/(password|one-time code|otp|verification code)/i.test(text)) signals.push("sensitive credential request");
  if (/(click here|bit\.ly|tinyurl|login now)/i.test(text)) signals.push("link or login pressure");
  return signals;
}

function makeChecklist(category) {
  const common = ["save a screenshot or copy", "confirm deadline", "confirm contact method"];
  const byCategory = {
    subscription: ["find cancel link", "check renewal amount", "confirm cancellation email"],
    return: ["print or save label", "pack item", "ship before cutoff"],
    housing: ["save receipt", "confirm payment method", "keep landlord message"],
    appointment: ["confirm location", "prepare documents", "set leave-time reminder"],
    school: ["complete form", "add signature", "submit proof"],
    travel: ["check ID names", "verify document expiration", "save confirmation"],
    bill: ["verify amount", "pay or dispute", "save receipt"],
    work: ["confirm owner", "confirm deliverable", "send reply"],
  };
  return [...(byCategory[category] || byCategory.work), ...common].slice(0, 5);
}

function makeMessageDraft(category, title, deadline, amount) {
  const date = deadline ? formatDate(deadline) : "the deadline";
  const money = amount ? ` and the amount is ${formatCurrency(amount)}` : "";

  if (category === "subscription") {
    return `Hi, I want to confirm the cancellation steps for ${title}. I understand the deadline is ${date}${money}. Please confirm the account, final charge, and whether cancellation will stop the renewal.`;
  }

  if (category === "return") {
    return `Hi, I want to complete this return before ${date}${money}. Please confirm the return label, drop-off method, and expected refund timing.`;
  }

  if (category === "bill" || category === "housing") {
    return `Hi, I am reviewing ${title}. Please confirm the due date, exact amount${money ? "" : ", amount"}, payment method, and whether any late fee applies after ${date}.`;
  }

  return `Hi, I am organizing ${title}. Please confirm the deadline, required documents, contact method, and anything missing from my side.`;
}

function render() {
  const items = loadItems();
  const filtered = applySearch(applyFilter(items, filterInput.value), searchInput.value);
  renderStats(items);
  renderObligations(filtered);
  renderMoney(items);
  renderMission(items);
  renderVault(items);
  renderMessages(items);
}

function applyFilter(items, filter) {
  if (filter === "urgent") return items.filter((item) => item.risk === "high" && item.status !== "resolved");
  if (filter === "money") return items.filter((item) => item.amount > 0);
  if (filter === "today") return items.filter((item) => item.deadline && daysUntil(item.deadline) <= 0);
  if (filter === "week") return items.filter((item) => item.deadline && daysUntil(item.deadline) <= 7 && item.status !== "resolved");
  if (filter === "missing") return items.filter((item) => item.missingInfo.length > 0 && item.status !== "resolved");
  if (filter === "resolved") return items.filter((item) => item.status === "resolved");
  return items.filter((item) => item.status !== "resolved");
}

function applySearch(items, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    [item.title, item.summary, item.rawText, item.category, item.owner, item.reference]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}

function renderStats(items) {
  const open = items.filter((item) => item.status !== "resolved");
  todayCount.textContent = open.filter((item) => item.deadline && daysUntil(item.deadline) <= 0).length;
  moneyAtRisk.textContent = formatCurrency(open.reduce((sum, item) => sum + (item.amount || 0), 0));
  resolvedCount.textContent = items.filter((item) => item.status === "resolved").length;
  missingProofCount.textContent = open.filter((item) => item.missingInfo.length > 0).length;
  highestRisk.textContent = open.some((item) => item.risk === "high") ? "High" : open.some((item) => item.risk === "medium") ? "Medium" : "Clear";
}

function renderObligations(items) {
  obligationList.innerHTML = "";
  if (!items.length) {
    obligationList.append(emptyState("No matching obligations yet."));
    return;
  }

  items
    .slice()
    .sort(sortByRiskAndDate)
    .forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.classList.add(item.risk);
      if (item.status === "resolved") node.classList.add("resolved");
      node.querySelector(".risk-pill").className = `risk-pill ${item.risk}`;
      node.querySelector(".risk-pill").textContent = `${item.risk.toUpperCase()} RISK`;
      node.querySelector("h3").textContent = item.title;
      node.querySelector(".summary").textContent = item.summary;
      node.querySelector(".meta-row").innerHTML = metaTags(item).map((tag) => `<span>${tag}</span>`).join("");
      const warning = item.scamSignals.length ? ` Safety check: ${item.scamSignals.join(", ")}.` : "";
      node.querySelector(".action-box").textContent = `${item.actionPlan}${warning}`;
      node.querySelector(".resolve-button").addEventListener("click", () => toggleResolved(item.id));
      obligationList.append(node);
    });
}

function renderMoney(items) {
  const moneyItems = items.filter((item) => item.amount > 0 && item.status !== "resolved").sort(sortByRiskAndDate);
  moneyList.innerHTML = "";
  if (!moneyItems.length) {
    moneyList.append(emptyState("No money leaks detected yet."));
    return;
  }

  moneyItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = `money-card ${item.risk}`;
    card.innerHTML = `
      <h3>${formatCurrency(item.amount)} at risk</h3>
      <p>${item.title}</p>
      <div class="meta-row">${metaTags(item).map((tag) => `<span>${tag}</span>`).join("")}</div>
    `;
    moneyList.append(card);
  });
}

function renderMission(items) {
  const open = items.filter((item) => item.status !== "resolved").sort(sortByRiskAndDate).slice(0, 5);
  missionList.innerHTML = "";
  if (!open.length) {
    missionList.append(emptyState("No mission yet. Capture one obligation to start."));
    return;
  }

  open.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.title}: ${item.actionPlan}`;
    missionList.append(li);
  });
}

function renderMessages(items) {
  const open = items.filter((item) => item.status !== "resolved").sort(sortByRiskAndDate).slice(0, 4);
  messageList.innerHTML = "";
  if (!open.length) {
    messageList.append(emptyState("Suggested replies will appear here."));
    return;
  }

  open.forEach((item) => {
    const card = document.createElement("article");
    card.className = "message-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>Editable draft for contacting the company, school, landlord, client, or office.</p>
      <textarea>${item.messageDraft}</textarea>
    `;
    messageList.append(card);
  });
}

function renderVault(items) {
  vaultList.innerHTML = "";
  const open = items.filter((item) => item.status !== "resolved").sort(sortByRiskAndDate).slice(0, 6);
  if (!open.length) {
    vaultList.append(emptyState("Important facts will appear here."));
    return;
  }

  open.forEach((item) => {
    const card = document.createElement("article");
    card.className = `vault-card ${item.risk}`;
    const missing = item.missingInfo.length ? item.missingInfo.join(", ") : "nothing obvious";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p><b>Owner:</b> ${item.owner}</p>
      <p><b>Deadline:</b> ${item.deadline ? formatDate(item.deadline) : "unknown"}</p>
      <p><b>Amount:</b> ${item.amount ? formatCurrency(item.amount) : "unknown"}</p>
      <p><b>Reference:</b> ${item.reference || "unknown"}</p>
      <p><b>Missing:</b> ${missing}</p>
      <p><b>Checklist:</b> ${item.checklist.join(", ")}</p>
      <p><b>Safety signals:</b> ${item.scamSignals.length ? item.scamSignals.join(", ") : "none detected"}</p>
    `;
    vaultList.append(card);
  });
}

function renderBriefing(item) {
  const missing = item.missingInfo.length ? item.missingInfo.join(", ") : "no obvious missing fields";
  briefCard.innerHTML = `
    <strong>${item.title}</strong>
    <p>${item.summary}</p>
    <ul>
      <li>Risk level: ${item.risk.toUpperCase()}</li>
      <li>Next action: ${item.actionPlan}</li>
      <li>Missing info: ${missing}</li>
      <li>Checklist: ${item.checklist.join(", ")}</li>
      <li>Suggested reply: “${item.messageDraft}”</li>
    </ul>
  `;
}

function metaTags(item) {
  return [
    item.owner,
    item.category,
    item.deadline ? formatDate(item.deadline) : "no deadline",
    item.amount ? formatCurrency(item.amount) : "no amount",
    `remind ${item.reminderDays}d before`,
  ];
}

function toggleResolved(id) {
  const items = loadItems().map((item) =>
    item.id === id ? { ...item, status: item.status === "resolved" ? "open" : "resolved" } : item
  );
  saveItems(items);
  render();
}

function emptyState(text) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = text;
  return empty;
}

function sortByRiskAndDate(a, b) {
  const riskRank = { high: 0, medium: 1, low: 2 };
  const riskDiff = riskRank[a.risk] - riskRank[b.risk];
  if (riskDiff) return riskDiff;
  return new Date(a.deadline || "2999-01-01") - new Date(b.deadline || "2999-01-01");
}

function daysUntil(dateString) {
  return Math.ceil((new Date(dateString) - startOfToday()) / 86400000);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

analyzeButton.addEventListener("click", () => {
  const text = captureInput.value.trim();
  if (!text) return;

  const manualAmount = manualAmountInput.value ? Number(manualAmountInput.value) : undefined;
  const item = parseItem(text, categoryInput.value, ownerInput.value, {
    deadline: manualDateInput.value ? new Date(`${manualDateInput.value}T12:00:00`).toISOString() : undefined,
    amount: Number.isFinite(manualAmount) ? manualAmount : undefined,
    reminderDays: Number(reminderInput.value),
  });
  const items = [item, ...loadItems()];
  saveItems(items);
  renderBriefing(item);
  captureInput.value = "";
  manualDateInput.value = "";
  manualAmountInput.value = "";
  render();
});

clearButton.addEventListener("click", () => {
  captureInput.value = "";
  briefCard.innerHTML = "<strong>No active briefing yet</strong><p>Add a life-admin item to generate a practical action plan.</p>";
});

seedButton.addEventListener("click", () => {
  const items = demoItems.map((item) => parseItem(item.text, item.category, item.owner));
  saveItems(items);
  renderBriefing(items[0]);
  render();
});

filterInput.addEventListener("change", render);
searchInput.addEventListener("input", render);

document.querySelectorAll(".quick-captures button").forEach((button) => {
  button.addEventListener("click", () => {
    captureInput.value = templates[button.dataset.template] || "";
    captureInput.focus();
  });
});

document.querySelectorAll(".audience-card").forEach((button) => {
  button.addEventListener("click", () => {
    captureInput.value = personaExamples[button.dataset.persona] || "";
    captureInput.scrollIntoView({ behavior: "smooth", block: "center" });
    captureInput.focus();
  });
});

copyBriefButton.addEventListener("click", async () => {
  const text = briefCard.innerText.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  copyBriefButton.textContent = "Copied";
  setTimeout(() => {
    copyBriefButton.textContent = "Copy briefing";
  }, 1600);
});

exportButton.addEventListener("click", () => {
  const data = JSON.stringify(loadItems(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dueproof-obligations.json";
  link.click();
  URL.revokeObjectURL(url);
});

enableNotificationsButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    enableNotificationsButton.textContent = "Not supported";
    return;
  }

  const permission = await Notification.requestPermission();
  enableNotificationsButton.textContent = permission === "granted" ? "Reminders enabled" : "Reminders off";
});

let pendingInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pendingInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!pendingInstallPrompt) return;
  await pendingInstallPrompt.prompt();
  pendingInstallPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}

render();
