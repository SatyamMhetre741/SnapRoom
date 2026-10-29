package com.snaproom.dto;

import java.time.Instant;
import java.util.UUID;

public record UserDto(
    UUID id,
    String email,
    String displayName,
    Instant createdAt
) {}
