// src/lib/security/simpleRateLimit.ts - NEW SIMPLIFIED VERSION
const requests = new Map<string, number[]>();

export function simpleRateLimit(ip: string, limit: number = 10): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const userRequests = requests.get(ip)!;
  const validRequests = userRequests.filter((time) => now - time < windowMs);

  if (validRequests.length >= limit) {
    return false;
  }

  validRequests.push(now);
  requests.set(ip, validRequests);
  return true;
}
