"use client";

/**
 * Turns the photograph Nat picks into the three files the site serves.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS HAPPENS IN THE BROWSER
 * ---------------------------------------------------------------------------
 * The site is a static export with no server to resize anything, and Supabase
 * only transforms images on its paid plan. So the phone does it, before
 * upload: a 4032px, 6 MB camera original becomes 1600, 1200 and 600px wide
 * copies of a few hundred kilobytes each, matching the three widths every
 * launch photograph ships at (see `Photo` in lib/collections.ts). Visitors
 * on a phone then download the 600px file, not the original. The same goes
 * for a replacement, which is prepared exactly like an upload.
 *
 * Two side effects, both wanted:
 *   - a phone's sideways-stored portrait comes out upright, because the
 *     browser applies the camera's orientation when it decodes the image
 *   - the location and camera details a phone writes into every photograph
 *     are left behind; a re-encoded canvas carries none of them
 *
 * WebP where the browser can write it, which is all current ones, and JPEG
 * where it cannot. Quality is set high enough that hair texture survives:
 * this is a portfolio, and the photographs are the product.
 */

export const MAX_INPUT_BYTES = 30 * 1024 * 1024;
/** Narrower than this would look soft in a gallery cell on a laptop. */
export const MIN_SHORT_EDGE = 600;
/** At most this many in one go, so a phone is not asked to hold dozens. */
export const MAX_BATCH = 12;

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);
// Some browsers report HEIC with an empty type, so the name is checked too.
const ACCEPTED_NAME = /\.(jpe?g|png|webp|heic|heif|avif)$/i;

/** Width, and the tallest it may be, for each file. Never upscaled. */
const SIZES = {
  large: { width: 1600, maxHeight: 2400 },
  src: { width: 1200, maxHeight: 1800 },
  small: { width: 600, maxHeight: 900 },
} as const;

export type PreparedPhoto = {
  type: "image/webp" | "image/jpeg";
  ext: "webp" | "jpg";
  /** Of the 1200w file, which is what width and height mean on a Photo. */
  width: number;
  height: number;
  large: Blob;
  src: Blob;
  small: Blob;
};

export class PhotoProblem extends Error {}

/** Cheap checks on the file itself, before anything is decoded. */
export function checkFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_NAME.test(file.name)) {
    return "That file is not a photo. Use a JPEG, PNG, WebP or HEIC image.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_INPUT_BYTES) {
    return "That photo is over 30 MB. Save a smaller copy and try again.";
  }
  return null;
}

/** The caller revokes `url` once it has finished drawing from the image. */
async function decode(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  try {
    await image.decode();
    return { image, url };
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoProblem(
      "This photo could not be opened in this browser. Save it as a JPEG and try again.",
    );
  }
}

function fit(
  width: number,
  height: number,
  size: { width: number; maxHeight: number },
) {
  const scale = Math.min(1, size.width / width, size.maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function draw(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new PhotoProblem("This browser could not prepare the photo. Try another browser.");
  }
  // White under anything transparent, so a PNG cannot turn black as a JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Frees the canvas's pixels now rather than whenever the collector gets to them. iOS needs this. */
function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Decodes, checks and resizes one photograph. Throws a PhotoProblem with a
 * sentence fit to show Nat when the file cannot be used.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const { image, url } = await decode(file);
  const { naturalWidth: width, naturalHeight: height } = image;

  if (Math.min(width, height) < MIN_SHORT_EDGE) {
    URL.revokeObjectURL(url);
    throw new PhotoProblem(
      `This photo is too small to look sharp on the website. It needs to be at least ${MIN_SHORT_EDGE} pixels across.`,
    );
  }

  /*
    Largest first, then each smaller size from the one above it. Stepping
    down keeps fine detail (individual strands, the lace edge) better than one
    jump from 4000px to 600px, and means only one full-size decode is held.
  */
  const largeSize = fit(width, height, SIZES.large);
  let large: HTMLCanvasElement;
  try {
    large = draw(image, largeSize.width, largeSize.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  const srcSize = fit(width, height, SIZES.src);
  const src = draw(large, srcSize.width, srcSize.height);
  const smallSize = fit(width, height, SIZES.small);
  const small = draw(src, smallSize.width, smallSize.height);

  try {
    let type: PreparedPhoto["type"] = "image/webp";
    let quality = 0.86;
    let largeBlob = await encode(large, type, quality);

    // A browser that cannot write WebP quietly hands back a PNG instead.
    if (!largeBlob || largeBlob.type !== "image/webp") {
      type = "image/jpeg";
      quality = 0.88;
      largeBlob = await encode(large, type, quality);
    }

    const [srcBlob, smallBlob] = await Promise.all([
      encode(src, type, quality),
      encode(small, type, quality),
    ]);

    if (!largeBlob || !srcBlob || !smallBlob) {
      throw new PhotoProblem("This photo could not be prepared. Try again, or try another photo.");
    }

    return {
      type,
      ext: type === "image/webp" ? "webp" : "jpg",
      width: srcSize.width,
      height: srcSize.height,
      large: largeBlob,
      src: srcBlob,
      small: smallBlob,
    };
  } finally {
    release(large);
    release(src);
    release(small);
  }
}
