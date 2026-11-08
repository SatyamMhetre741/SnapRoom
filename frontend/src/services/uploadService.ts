import { apiRequest } from './apiClient';
import { PresignUploadItemResponse, UploadProgress } from '../types';

export const uploadService = {
  /**
   * Request a presigned PUT URL from Spring Boot S3Presigner
   * POST /api/rooms/{roomId}/presign-upload
   */
  async getPresignedUploadUrl(
    roomId: string,
    fileName: string,
    contentType: string
  ): Promise<PresignUploadItemResponse> {
    return apiRequest<PresignUploadItemResponse>(
        `/rooms/${roomId}/presign-upload`,
        {
          method: 'POST',
          body: JSON.stringify({ fileName, contentType }),
        }
      );
  },

  /**
   * Uploads binary file directly to S3 / Cloudflare R2 / MinIO via presigned PUT URL.
   * Tracks upload progress using XMLHttpRequest.
   */
  uploadDirectToStorage(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Storage PUT failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during direct storage upload'));
      };

      xhr.send(file);
    });
  },

  /**
   * Orchestrates batch upload:
   * 1. Validates files (<= 15MB, jpg/png/webp)
   * 2. Obtains presigned PUT URLs
   * 3. Uploads directly to storage in parallel (concurrency 3)
   * 4. Calls /process-photos with all objectKeys when complete
   */
  async uploadBatch(
    roomId: string,
    files: File[],
    onBatchProgress?: (items: UploadProgress[], overallPercent: number) => void
  ): Promise<string[]> {
    const validFiles = files.filter((f) => {
      const isType = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
      const isSize = f.size <= 15 * 1024 * 1024;
      return isType && isSize;
    });

    if (validFiles.length === 0) {
      throw new Error('No valid images to upload. Ensure files are JPEG, PNG, or WebP under 15MB.');
    }

    const progressList: UploadProgress[] = validFiles.map((file) => ({
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'idle',
    }));

    const updateUI = () => {
      const totalProgress = progressList.reduce((acc, curr) => acc + curr.progress, 0);
      const overall = Math.round(totalProgress / progressList.length);
      if (onBatchProgress) onBatchProgress([...progressList], overall);
    };

    updateUI();

    const uploadedKeys: string[] = [];
    const concurrency = 3;
    let index = 0;

    const runWorker = async (): Promise<void> => {
      while (index < validFiles.length) {
        const currentIndex = index++;
        const file = validFiles[currentIndex];
        const progressItem = progressList[currentIndex];

        progressItem.status = 'uploading';
        updateUI();

        try {
          const presigned = await this.getPresignedUploadUrl(
            roomId,
            file.name,
            file.type || 'image/jpeg'
          );

          await this.uploadDirectToStorage(presigned.uploadUrl, file, (percent) => {
            progressItem.progress = percent;
            updateUI();
          });

          uploadedKeys.push(presigned.objectKey);
          progressItem.status = 'done';
          progressItem.progress = 100;
          updateUI();
        } catch (err: unknown) {
          progressItem.status = 'error';
          progressItem.error = (err as Error).message || 'Upload failed';
          updateUI();
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, validFiles.length) },
      () => runWorker()
    );
    await Promise.all(workers);

    const failed = progressList.filter((item) => item.status === 'error');
    if (failed.length > 0 && uploadedKeys.length === 0) {
      throw new Error(failed[0].error || 'No photos could be uploaded.');
    }

    // Trigger AI photo processing for successful uploads
    if (uploadedKeys.length > 0) {
      try {
        await apiRequest(`/rooms/${roomId}/process-photos`, {
          method: 'POST',
          body: JSON.stringify({ objectKeys: uploadedKeys }),
        });
      } catch {
        // Handled gracefully
      }
    }

    return uploadedKeys;
  },
};
