export type RuntimeFallbackOptions = {
  documentRef?: Pick<Document, "body" | "getElementById">;
  rootId?: string;
  message?: string;
  detail?: string;
};

export function renderRuntimeFallback({
  documentRef = document,
  rootId = "root",
  message = "Something went wrong",
  detail = "Refresh the page to retry.",
}: RuntimeFallbackOptions = {}) {
  const rootElement = documentRef.getElementById?.(rootId);
  if (rootElement && "innerHTML" in rootElement) {
    rootElement.innerHTML = "";
  }

  const body = documentRef.body ?? { innerHTML: "" };
  body.innerHTML = `
    <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:sans-serif;background:#0b1020;color:white;padding:24px;text-align:center;">
      <div>
        <h1 style="font-size:1.5rem;margin-bottom:8px;">${message}</h1>
        <p style="color:#cbd5e1;">${detail}</p>
      </div>
    </div>
  `;

  return body.innerHTML;
}
