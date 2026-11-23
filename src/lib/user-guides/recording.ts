import { HELP_GUIDE_VIDEO_EXTENSIONS } from "@/lib/constants";

/**
 * A recording is a link to a video file, not an upload: video bytes would sit
 * in the database next to the images, which a small server cannot carry.
 * Client safe, so the editor and the route agree on what is accepted.
 */
export function isRecordingUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();
    return url.protocol === "https:" && HELP_GUIDE_VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
}
