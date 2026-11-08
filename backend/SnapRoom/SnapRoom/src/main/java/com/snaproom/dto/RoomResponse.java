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
    String userRole,
    String membershipStatus
) {
    public RoomResponse(UUID id, String inviteCode, String name, UUID leaderId, Instant createdAt,
                        Instant expiresAt, long memberCount, long photoCount, String userRole) {
        this(id, inviteCode, name, leaderId, createdAt, expiresAt, memberCount, photoCount, userRole,
                "LEADER".equals(userRole) ? "APPROVED" : "NONE");
    }
}
