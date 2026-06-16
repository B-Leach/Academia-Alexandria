export const PAPER_LICENSES = [
  { value: "CC-BY-4.0", label: "CC BY 4.0 (Attribution)" },
  { value: "CC-BY-SA-4.0", label: "CC BY-SA 4.0 (Attribution-ShareAlike)" },
  { value: "CC-BY-NC-4.0", label: "CC BY-NC 4.0 (Attribution-NonCommercial)" },
  { value: "CC-BY-NC-SA-4.0", label: "CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike)" },
  { value: "CC0-1.0", label: "CC0 1.0 (Public Domain)" },
  { value: "all-rights-reserved", label: "All Rights Reserved" },
] as const;

export type PaperLicense = (typeof PAPER_LICENSES)[number]["value"];

export function getLicenseLabel(value: string): string | undefined {
  return PAPER_LICENSES.find((l) => l.value === value)?.label;
}

export function getLicenseUrl(value: string): string | undefined {
  const urls: Record<string, string> = {
    "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
    "CC-BY-NC-4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
    "CC-BY-NC-SA-4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  };
  return urls[value];
}
