package com.snaproom.repository;

import java.util.UUID;

public interface MemberMatchProjection {
    UUID getUserId();
    float getSimilarityScore();
}
