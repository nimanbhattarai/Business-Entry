/*
  Firebase Cloud Messaging integration stub.
  Replace with firebase-admin initialization and token storage.
*/

async function sendDailyProductionReminder(_deviceTokens) {
  return { queued: true, type: "daily-production-reminder" };
}

async function sendLowStockAlert(_deviceTokens, _remaining) {
  return { queued: true, type: "low-stock-alert" };
}

async function sendPendingPaymentAlert(_deviceTokens, _count) {
  return { queued: true, type: "pending-payment-alert" };
}

async function evaluateBusinessAlerts({ lowStockWarning, pendingPayment }) {
  const alerts = [];
  if (lowStockWarning) alerts.push({ type: "low-stock-alert", priority: "high" });
  if (pendingPayment > 0) alerts.push({ type: "pending-payment-alert", priority: "medium", amount: pendingPayment });
  return alerts;
}

module.exports = {
  sendDailyProductionReminder,
  sendLowStockAlert,
  sendPendingPaymentAlert,
  evaluateBusinessAlerts
};
