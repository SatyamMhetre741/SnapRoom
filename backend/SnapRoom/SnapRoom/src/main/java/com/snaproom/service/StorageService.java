package com.snaproom.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${storage.bucket-name:${r2.bucket-name:snaproom}}")
    private String bucketName;

    /**
     * Generates a presigned PUT URL for direct browser uploads to Cloudflare R2.
     */
    public String generatePresignedPutUrl(String objectKey, String contentType, Duration expiration) {
        PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey);

        if (contentType != null && !contentType.isBlank()) {
            requestBuilder.contentType(contentType);
        }

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .putObjectRequest(requestBuilder.build())
                .build();

        return s3Presigner.presignPutObject(presignRequest).url().toString();
    }

    /**
     * Generates a short-lived private view URL for Cloudflare R2.
     */
    public String generatePresignedGetUrl(String objectKey, Duration expiration) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Fetches object bytes from storage for AI processing.
     */
    public byte[] getObjectAsBytes(String objectKey) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        return s3Client.getObjectAsBytes(getObjectRequest).asByteArray();
    }

    /**
     * Streams object content directly for ZIP downloads without loading in memory.
     */
    public ResponseInputStream<GetObjectResponse> getObjectInputStream(String objectKey) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        return s3Client.getObject(getObjectRequest);
    }

    /**
     * Deletes a single object from storage.
     */
    public void deleteObject(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return;
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.debug("Deleted object {} from S3", objectKey);
        } catch (Exception ex) {
            log.warn("Failed to delete object {} from S3: {}", objectKey, ex.getMessage());
        }
    }

    /**
     * Batch deletes a list of objects from storage.
     */
    public void deleteObjects(List<String> objectKeys) {
        if (objectKeys == null || objectKeys.isEmpty()) return;

        List<ObjectIdentifier> identifiers = objectKeys.stream()
                .filter(k -> k != null && !k.isBlank())
                .map(k -> ObjectIdentifier.builder().key(k).build())
                .toList();

        if (identifiers.isEmpty()) return;

        for (int i = 0; i < identifiers.size(); i += 1000) {
            List<ObjectIdentifier> batch = identifiers.subList(i, Math.min(i + 1000, identifiers.size()));
            try {
                DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                        .bucket(bucketName)
                        .delete(Delete.builder().objects(batch).quiet(true).build())
                        .build();
                s3Client.deleteObjects(deleteRequest);
                log.info("Batch deleted {} objects from S3 bucket {}", batch.size(), bucketName);
            } catch (Exception ex) {
                log.error("Failed to delete batch of objects from S3: {}", ex.getMessage(), ex);
            }
        }
    }

    /**
     * Deletes all objects in storage matching a given key prefix (e.g. 'rooms/{roomId}/').
     */
    public void deleteObjectsWithPrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) return;

        try {
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResponse;
            do {
                listResponse = s3Client.listObjectsV2(listRequest);
                List<ObjectIdentifier> toDelete = listResponse.contents().stream()
                        .map(s3Object -> ObjectIdentifier.builder().key(s3Object.key()).build())
                        .toList();

                if (!toDelete.isEmpty()) {
                    for (int i = 0; i < toDelete.size(); i += 1000) {
                        List<ObjectIdentifier> batch = toDelete.subList(i, Math.min(i + 1000, toDelete.size()));
                        DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                                .bucket(bucketName)
                                .delete(Delete.builder().objects(batch).quiet(true).build())
                                .build();
                        s3Client.deleteObjects(deleteRequest);
                    }
                    log.info("Deleted {} objects with prefix '{}' from S3", toDelete.size(), prefix);
                }

                String continuationToken = listResponse.nextContinuationToken();
                if (continuationToken != null) {
                    listRequest = listRequest.toBuilder().continuationToken(continuationToken).build();
                } else {
                    break;
                }
            } while (listResponse.isTruncated());
        } catch (Exception ex) {
            log.error("Failed to delete objects with prefix '{}' from S3: {}", prefix, ex.getMessage(), ex);
        }
    }
}

