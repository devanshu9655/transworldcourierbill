import type { AWB, Settings, AddressBookEntry } from "./types";

const AWB_KEY = "tcs_awbs";
const ADDR_KEY = "tcs_address_book";
const SETTINGS_KEY = "tcs_settings";
const DRAFT_KEY = "tcs_awb_draft";

const DEFAULT_SETTINGS: Settings = {
  defaultFscPercent: 46,
  defaultGstMode: "auto",
  defaultOrigin: "RAJKOT",
  defaultService: "DHL_AMD",
  gstin: "24XXXXXXXXXXXXX",
  personalEmail: "",
  personalPhone: "",
  companyName: "",
  companyAddress: "",
  companyWebsite: "",
  restrictedKeywords: ["perfume", "battery", "liquid", "medicine"]
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getAWBs(): AWB[] {
  if (!isBrowser()) return [];
  return safeParse<AWB[]>(localStorage.getItem(AWB_KEY), []);
}

export function getAWB(id: string): AWB | undefined {
  return getAWBs().find((a) => a.id === id);
}

export function saveAWB(awb: AWB): void {
  if (!isBrowser()) return;
  const list = getAWBs();
  const idx = list.findIndex((a) => a.id === awb.id);
  if (idx >= 0) list[idx] = awb;
  else list.unshift(awb);
  localStorage.setItem(AWB_KEY, JSON.stringify(list));
}

export function deleteAWB(id: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(AWB_KEY, JSON.stringify(getAWBs().filter((a) => a.id !== id)));
}

export function getAddressBook(): AddressBookEntry[] {
  if (!isBrowser()) return [];
  return safeParse<AddressBookEntry[]>(localStorage.getItem(ADDR_KEY), []);
}

export function saveAddressEntry(entry: AddressBookEntry): void {
  if (!isBrowser()) return;
  const list = getAddressBook();
  const idx = list.findIndex((e) => e.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  localStorage.setItem(ADDR_KEY, JSON.stringify(list));
}

export function getSettings(): Settings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...safeParse<Partial<Settings>>(localStorage.getItem(SETTINGS_KEY), {}) };
}

export function saveSettings(s: Settings): void {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function saveDraft(awb: AWB) {
  if (!isBrowser()) return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(awb));
}

export function getDraft(): AWB | null {
  if (!isBrowser()) return null;
  return safeParse<AWB | null>(localStorage.getItem(DRAFT_KEY), null);
}

export function clearDraft() {
  if (!isBrowser()) return;
  localStorage.removeItem(DRAFT_KEY);
}
