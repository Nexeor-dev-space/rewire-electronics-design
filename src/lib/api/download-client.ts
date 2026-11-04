import { ApiError } from "./api-client";
import type { ApiResponse } from "./api-response";

/**
 * File downloads (the invoice PDF), kept apart from `apiRequest` because a
 * success is raw bytes, not the JSON envelope (docs/DATA-LAYER.md, "Binary
 * responses"). A plain `<a download>` would save an error envelope as a
 * stray `.json` file; this reads the response first, so a failure throws
 * the same `ApiError` as `apiRequest` and the caller can show its message.
 *
 * On success the browser saves the file under the server's
 * `Content-Disposition` name.
 */

const networkError = () =>
  new ApiError({ code: "NETWORK", message: "We couldn't reach the server. Please try again." });

const FILE_NAME = /filename="([^"]+)"/;

export async function downloadFile(url: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw networkError();
  }

  if (!res.ok || (res.headers.get("Content-Type") ?? "").includes("application/json")) {
    const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw json && !json.success ? new ApiError(json.error) : networkError();
  }

  const blob = await res.blob();
  const fileName = FILE_NAME.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "download";
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Let the click start the download before the blob URL goes away.
  setTimeout(() => URL.revokeObjectURL(href));
}
