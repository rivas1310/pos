const STORAGE_KEY = "pos-sales-v1";
const API_ENDPOINT = "/api/sales";

const saleForm = document.getElementById("saleForm");
const salesList = document.getElementById("salesList");
const pendingCount = document.getElementById("pendingCount");
const syncedCount = document.getElementById("syncedCount");
const message = document.getElementById("message");
const networkStatus = document.getElementById("networkStatus");
const syncNowButton = document.getElementById("syncNow");
const installSection = document.getElementById("installSection");
const installButton = document.getElementById("installBtn");

let deferredInstallPrompt = null;

const state = {
  sales: loadSales(),
};

function loadSales() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignorar errores de parseo
  }
  return [];
}

function saveSales() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sales));
}

function setMessage(text, timeoutMs = 3000) {
  message.textContent = text;
  if (timeoutMs > 0) {
    setTimeout(() => {
      if (message.textContent === text) message.textContent = "";
    }, timeoutMs);
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(amount);
}

function updateCounters() {
  const pending = state.sales.filter((sale) => !sale.synced).length;
  pendingCount.textContent = pending;
  syncedCount.textContent = state.sales.length - pending;
}

function renderSales() {
  salesList.innerHTML = "";
  [...state.sales]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20)
    .forEach((sale) => {
      const item = document.createElement("li");
      const left = document.createElement("div");
      left.innerHTML = `<strong>${sale.product}</strong><br><small>${sale.quantity} x ${formatCurrency(
        sale.price
      )}</small>`;

      const right = document.createElement("div");
      const total = document.createElement("div");
      total.textContent = formatCurrency(sale.quantity * sale.price);
      const badge = document.createElement("span");
      badge.className = `badge ${sale.synced ? "synced" : "pending"}`;
      badge.textContent = sale.synced ? "Sincronizada" : "Pendiente";

      right.append(total, badge);
      item.append(left, right);
      salesList.append(item);
    });

  updateCounters();
}

function addSale({ product, quantity, price }) {
  state.sales.push({
    id: crypto.randomUUID(),
    product,
    quantity,
    price,
    createdAt: Date.now(),
    synced: false,
  });
  saveSales();
  renderSales();
}

async function postSale(sale) {
  const payload = {
    id: sale.id,
    product: sale.product,
    quantity: sale.quantity,
    price: sale.price,
    createdAt: sale.createdAt,
  };

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error de API: ${response.status}`);
  }
}

async function syncPendingSales() {
  if (!navigator.onLine) {
    setMessage("Sin internet: las ventas siguen guardándose localmente.");
    return;
  }

  const pendingSales = state.sales.filter((sale) => !sale.synced);
  if (pendingSales.length === 0) {
    setMessage("No hay ventas pendientes por sincronizar.");
    return;
  }

  let syncedNow = 0;
  for (const sale of pendingSales) {
    try {
      await postSale(sale);
      sale.synced = true;
      syncedNow += 1;
    } catch {
      break;
    }
  }

  saveSales();
  renderSales();

  if (syncedNow > 0) {
    setMessage(`Se sincronizaron ${syncedNow} venta(s).`);
  } else {
    setMessage("No se pudo sincronizar. Reintentará cuando vuelva el internet.");
  }
}

function updateNetworkUI() {
  const isOnline = navigator.onLine;
  networkStatus.textContent = isOnline ? "En línea" : "Sin conexión";
  networkStatus.classList.toggle("online", isOnline);
  networkStatus.classList.toggle("offline", !isOnline);

  if (isOnline) {
    syncPendingSales();
  }
}

saleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(saleForm);
  const product = String(formData.get("product") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));

  if (!product || Number.isNaN(quantity) || Number.isNaN(price)) {
    setMessage("Completa los datos de la venta.");
    return;
  }

  addSale({ product, quantity, price });
  saleForm.reset();
  document.getElementById("quantity").value = "1";
  setMessage("Venta guardada localmente.");

  if (navigator.onLine) {
    syncPendingSales();
  }
});

syncNowButton.addEventListener("click", () => {
  syncPendingSales();
});

window.addEventListener("online", updateNetworkUI);
window.addEventListener("offline", updateNetworkUI);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installSection.classList.remove("hidden");
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installSection.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch {
      setMessage("No se pudo registrar el modo offline.");
    }
  });
}

renderSales();
updateNetworkUI();
