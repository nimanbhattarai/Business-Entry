import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "soletrack-sync-queue";

export async function queueRequest(request) {
  const existing = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || "[]");
  existing.push({ ...request, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
}

export async function flushQueue(fetcher) {
  const existing = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || "[]");
  const remaining = [];

  for (const req of existing) {
    try {
      await fetcher(req);
    } catch (_e) {
      remaining.push(req);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
