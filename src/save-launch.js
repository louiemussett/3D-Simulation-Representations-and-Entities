export function requestedSaveSlot(search = "") {
  const name = new URLSearchParams(String(search || "")).get("slot")?.trim();
  return name || null;
}

export function locationWithoutRequestedSaveSlot(href) {
  const url = new URL(href);
  url.searchParams.delete("slot");
  return `${url.pathname}${url.search}${url.hash}`;
}
