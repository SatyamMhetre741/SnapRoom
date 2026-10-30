package com.snaproom.dto;

import java.time.Instant;
import java.util.UUID;

public record RoomResponse(
    UUID id,
    String inviteCode,
    String name,
    UUID leaderId,
    Instant createdAt,
    Instant expiresAt,
    long memberCount,
    long photoCount,
    String userRole
) {}
