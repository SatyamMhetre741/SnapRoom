package com.snaproom.dto;

public record AuthResponse(
    String token,
    UserDto user
) {}
