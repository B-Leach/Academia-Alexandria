export function isOrcidEnabled(): boolean {
  return !!(process.env.AUTH_ORCID_ID && process.env.AUTH_ORCID_SECRET);
}
