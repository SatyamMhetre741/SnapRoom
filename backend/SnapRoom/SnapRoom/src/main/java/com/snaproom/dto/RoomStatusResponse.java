package com.snaproom.dto;

public record RoomStatusResponse(
    long totalPhotos,
    long pendingCount,
    long processingCount,
    long completedCount,
    long failedCount,
    boolean isProcessing
) {}
