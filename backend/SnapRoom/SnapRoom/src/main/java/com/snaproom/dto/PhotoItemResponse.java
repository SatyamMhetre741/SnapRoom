package com.snaproom.dto;

import java.time.Instant;
import java.util.UUID;

public record PhotoItemResponse(
    UUID id,
    UUID roomId,
    UUID uploaderId,
    String objectKey,
    String fileName,
    String status,
    String presignedGetUrl,
    Float similarityScore,
    Instant createdAt
) {}
