package com.snaproom.dto;

public record PresignUploadResponse(
    String objectKey,
    String uploadUrl,
    String fileName
) {}
