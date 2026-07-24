import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  // Option config for image compression
  const options = {
    maxSizeMB: 1, // Compress to max 1MB
    maxWidthOrHeight: 1920, // Max width/height
    useWebWorker: true,
    fileType: 'image/jpeg', // convert all to jpeg to save space
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // If the compressed file is somehow larger than the original (rare, but happens with small images), use the original
    if (compressedFile.size > file.size) {
       return file;
    }
    return compressedFile;
  } catch (error) {
    console.error('Lỗi khi nén ảnh:', error);
    // Return original file on error so we don't break the upload flow
    return file;
  }
}
