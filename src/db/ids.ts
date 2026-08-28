// Local, non-cryptographic id generator — good enough for a local-only db
// where ids just need to be unique on-device, not globally unpredictable.
export function generateId(prefix?: string): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  const id = `${Date.now().toString(36)}${rand()}${rand()}`;
  return prefix ? `${prefix}_${id}` : id;
}
