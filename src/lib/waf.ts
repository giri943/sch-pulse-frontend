import type { Classification, WafVendor } from "@/lib/types";

/** Human label for a detected WAF vendor. */
export const WAF_LABEL: Record<WafVendor, string> = {
  cloudflare: "Cloudflare",
  akamai: "Akamai",
  "f5-bigip": "F5 BIG-IP",
  imperva: "Imperva",
  "aws-waf": "AWS WAF",
  sucuri: "Sucuri",
};

/** True when the latest check means "site is up, but a firewall is gating our checks". */
export function isWafInterference(c?: Classification | null): boolean {
  return c === "up_blocked" || c === "up_challenged";
}

/** Short label for the classification, for badges/tooltips. */
export function classificationLabel(c?: Classification | null): string {
  switch (c) {
    case "up_blocked": return "Protected (blocked)";
    case "up_challenged": return "Protected (challenged)";
    case "content_mismatch": return "Content mismatch";
    case "down_origin": return "Origin error";
    case "down_network": return "Network error";
    case "dns_failed": return "DNS failed";
    case "tls_failed": return "TLS error";
    case "timeout": return "Timed out";
    case "up": return "Healthy";
    default: return "—";
  }
}

/**
 * Per-vendor guidance for letting our monitor through. The token line works for
 * any vendor that supports header rules; IP allow-listing is the universal fallback.
 */
export function wafFixSteps(vendor: WafVendor): string[] {
  const common = [
    "Allow-list our checks by adding a request-header rule, or by allow-listing our monitoring IPs.",
  ];
  switch (vendor) {
    case "cloudflare":
      return [
        "In Cloudflare → Security → WAF → Custom rules, add a Skip rule that matches our User-Agent (contains \"SchbangPulse\") and skips Bot Fight Mode / managed challenges.",
        "Or enable \"Allow verified bots\" once we're listed in Cloudflare's Verified Bots program.",
      ];
    case "f5-bigip":
      return [
        "In the F5 ASM/Advanced WAF policy, add our User-Agent (\"SchbangPulse\") to the trusted bot / allow list so first-contact challenges are skipped.",
        "Or allow-list our monitoring IPs in the policy's IP intelligence / allow list.",
      ];
    case "akamai":
      return [
        "In Akamai Bot Manager, categorise our User-Agent (\"SchbangPulse\") as an allowed/monitoring bot, or add an exception in the App & API Protector policy.",
      ];
    case "imperva":
      return [
        "In Imperva, add our User-Agent (\"SchbangPulse\") to the allow list / good-bot policy, or allow-list our monitoring IPs.",
      ];
    case "aws-waf":
      return [
        "In AWS WAF, add an Allow rule for our User-Agent (\"SchbangPulse\") above the blocking rules, or allow-list our monitoring IP set.",
      ];
    case "sucuri":
      return [
        "In the Sucuri firewall dashboard → Settings → Access Control, add our monitoring IPs to the whitelist, or whitelist our User-Agent.",
      ];
    default:
      return common;
  }
}
