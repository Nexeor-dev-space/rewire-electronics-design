import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { EMAIL_INLINE_IMAGE_MAX_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { InlineImage } from "@/lib/email/email-outcome";
import { BRAND_IMAGE_PATHS } from "@/lib/email/order-email";
import { readImage } from "@/services/media.service";
import type { OrderDetail } from "@/types/order";

/**
 * Images that travel inside the email. A picture linked by web address only
 * shows when the mail app can reach the site (it fails on a private or
 * tunnelled address, and many apps block remote images). Sending the logo and
 * the product photos with the email, as `cid:` images, shows them everywhere.
 * A photo bigger than `EMAIL_INLINE_IMAGE_MAX_BYTES` is left as a web address
 * so the email stays light. See docs/MESSAGING.md.
 */

const LOGO_CID = "rewire-logo";
const lineCid = (index: number) => `rewire-line-${index}`;
const cidSource = (cid: string) => `cid:${cid}`;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface OrderEmailImages {
  /** Undefined when the file could not be read; the layout then uses the site address. */
  logo: string | undefined;
  /** Order line id to the `cid:` source of its photo. Lines left out use their web address. */
  lines: Record<string, string>;
  attachments: InlineImage[];
}

async function logoImage(): Promise<InlineImage | null> {
  try {
    const content = await readFile(path.join(process.cwd(), "public", BRAND_IMAGE_PATHS.logo));
    return { cid: LOGO_CID, filename: "rewire-logo.png", content, contentType: "image/png" };
  } catch (error) {
    console.error("email logo could not be read; it will load from the site instead", error);
    return null;
  }
}

async function lineImage(imageId: string, index: number): Promise<InlineImage | null> {
  try {
    const image = await readImage(imageId);
    const content = Buffer.from(image.data);
    if (content.length > EMAIL_INLINE_IMAGE_MAX_BYTES) return null;
    const extension = EXTENSIONS[image.mimeType] ?? "img";
    return { cid: lineCid(index), filename: `product-${index + 1}.${extension}`, content, contentType: image.mimeType };
  } catch (error) {
    console.error(`email photo ${imageId} could not be read; it will load from the site instead`, error);
    return null;
  }
}

export async function loadOrderEmailImages(order: OrderDetail): Promise<OrderEmailImages> {
  const items = await prisma.orderItem.findMany({
    where: { id: { in: order.lines.map((line) => line.id) }, imageId: { not: null } },
    select: { id: true, imageId: true },
  });
  const imageIds = new Map(items.map((item) => [item.id, item.imageId]));

  const [logo, photos] = await Promise.all([
    logoImage(),
    Promise.all(
      order.lines.map((line, index) => {
        const imageId = imageIds.get(line.id);
        return imageId ? lineImage(imageId, index) : Promise.resolve(null);
      }),
    ),
  ]);

  const lines: Record<string, string> = {};
  order.lines.forEach((line, index) => {
    const photo = photos[index];
    if (photo) lines[line.id] = cidSource(photo.cid);
  });

  return {
    logo: logo ? cidSource(logo.cid) : undefined,
    lines,
    attachments: [...(logo ? [logo] : []), ...photos.filter((photo): photo is InlineImage => photo !== null)],
  };
}
