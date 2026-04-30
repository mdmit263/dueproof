const STORAGE_KEY = "proofpilot-obligations";

const captureInput = document.querySelector("#captureInput");
const categoryInput = document.querySelector("#categoryInput");
const ownerInput = document.querySelector("#ownerInput");
const analyzeButton = document.querySelector("#analyzeButton");
const clearButton = document.querySelector("#clearButton");
const seedButton = document.querySelector("#seedButton");
const filterInput = document.querySelector("#filterInput");
const obligationList = document.querySelector("#obligationList");
const moneyList = document.querySelector("#moneyList");
const missionList = document.querySelector("#missionList");
const vaultList = document.querySelector("#vaultList");
const briefCard = document.querySelector("#briefCard");
const todayCount = document.querySelector("#todayCount");
const moneyAtRisk = document.querySelector("#moneyAtRisk");
const highestRisk = document.querySelector("#highestRisk");
const resolvedCount = document.querySelector("#resolvedCount");
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

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function parseItem(text, selectedCategory, owner) {
  const detectedCategory = selectedCategory === "auto" ? detectCategory(text) : selectedCategory;
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const deadline = dates[0] || null;
  const amount = amounts[0] || 0;
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
    actionPlan: makeActionPlan(text, detectedCategory, deadline, amount),
    missingInfo: findMissingInfo(text, detectedCategory),
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

function render() {
  const items = loadItems();
  const filtered = applyFilter(items, filterInput.value);
  renderStats(items);
  renderObligations(filtered);
  renderMoney(items);
  renderMission(items);
  renderVault(items);
}

function applyFilter(items, filter) {
  if (filter === "urgent") return items.filter((item) => item.risk === "high" && item.status !== "resolved");
  if (filter === "money") return items.filter((item) => item.amount > 0);
  if (filter === "today") return items.filter((item) => item.deadline && daysUntil(item.deadline) <= 0);
  if (filter === "resolved") return items.filter((item) => item.status === "resolved");
  return items.filter((item) => item.status !== "resolved");
}

function renderStats(items) {
  const open = items.filter((item) => item.status !== "resolved");
  todayCount.textContent = open.filter((item) => item.deadline && daysUntil(item.deadline) <= 0).length;
  moneyAtRisk.textContent = formatCurrency(open.reduce((sum, item) => sum + (item.amount || 0), 0));
  resolvedCount.textContent = items.filter((item) => item.status === "resolved").length;
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
      node.querySelector(".action-box").textContent = item.actionPlan;
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
      <li>Suggested reply: “Thanks. I’m reviewing this now. Please confirm the deadline, amount, and best contact method so I can resolve it correctly.”</li>
    </ul>
  `;
}

function metaTags(item) {
  return [
    item.owner,
    item.category,
    item.deadline ? formatDate(item.deadline) : "no deadline",
    item.amount ? formatCurrency(item.amount) : "no amount",
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

  const item = parseItem(text, categoryInput.value, ownerInput.value);
  const items = [item, ...loadItems()];
  saveItems(items);
  renderBriefing(item);
  captureInput.value = "";
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
