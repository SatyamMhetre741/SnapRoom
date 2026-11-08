package com.snaproom.dto;

import java.time.Instant;
import java.util.UUID;

public record MemberRequestResponse(
        UUID memberId,
        UUID userId,
        String displayName,
        String email,
        String approvalStatus,
        Instant enrolledAt
) {}
