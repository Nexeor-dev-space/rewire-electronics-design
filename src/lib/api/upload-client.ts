import { ApiError } from "./api-client";
import type { ApiResponse } from "./api-response";
import { API_ENDPOINTS } from "./api-endpoints";

/**
 * File upload, kept apart from `apiRequest` for one reason: `fetch` cannot
 * report upload progress, and the image modals show a real percentage rather
 * than an indeterminate spinner. This is the only `XMLHttpRequest` in the
 * codebase.
 *
 * It unwraps the same `ApiResponse` envelope and throws the same `ApiError`,
 * so callers cannot tell which transport carried the request.
 */

export interface UploadedImage {
  id: string;
  url: string;
}

interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

const networkError = () =>
  new ApiError({ code: "NETWORK", message: "We couldn't reach the server. Please try again." });

export function uploadImage(file: File, options: UploadOptions = {}): Promise<UploadedImage> {
  const { onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const body = new FormData();
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_ENDPOINTS.uploads.images);
    // Anything that isn't JSON — a proxy's HTML 502, say — parses to null,
    // which falls through to the network error below rather than crashing.
    xhr.responseType = "json";

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      const json = xhr.response as ApiResponse<UploadedImage> | null;
      if (!json) {
        reject(networkError());
      } else if (!json.success) {
        reject(new ApiError(json.error));
      } else {
        resolve(json.data);
      }
    });

    xhr.addEventListener("error", () => reject(networkError()));
    xhr.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(body);
  });
}
