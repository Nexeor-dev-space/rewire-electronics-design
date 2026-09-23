"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadImage, type UploadedImage } from "@/lib/api/upload-client";

/**
 * Uploads an image and reports how far it has got. Nothing is cached — an
 * upload has no query key — so this is a mutation with a progress counter
 * beside it.
 */
export function useUploadImage() {
  const [progress, setProgress] = useState(0);

  const mutation = useMutation<UploadedImage, Error, File>({
    mutationFn: (file) => uploadImage(file, { onProgress: setProgress }),
    onMutate: () => setProgress(0),
  });

  return { ...mutation, progress };
}
