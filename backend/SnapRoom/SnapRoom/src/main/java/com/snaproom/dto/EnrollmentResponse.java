package com.snaproom.dto;

import java.time.Instant;
import java.util.UUID;

public record EnrollmentResponse(
    UUID memberId,
    UUID roomId,
    String role,
    Instant enrolledAt,
    String message
) {}
