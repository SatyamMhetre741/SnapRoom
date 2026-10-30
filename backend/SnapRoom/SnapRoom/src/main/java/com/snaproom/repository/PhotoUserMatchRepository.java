package com.snaproom.repository;

import com.snaproom.entity.PhotoUserMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface PhotoUserMatchRepository extends JpaRepository<PhotoUserMatch, UUID> {

    List<PhotoUserMatch> findByRoomIdAndUserIdOrderByCreatedAtDesc(UUID roomId, UUID userId);

    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO photo_user_matches (id, photo_id, room_id, user_id, similarity_score, created_at)
        VALUES (:id, :photoId, :roomId, :userId, :similarityScore, :createdAt)
        ON CONFLICT (photo_id, user_id)
        DO UPDATE SET similarity_score = GREATEST(photo_user_matches.similarity_score, EXCLUDED.similarity_score)
        """, nativeQuery = true)
    void upsertMatch(
        @Param("id") UUID id,
        @Param("photoId") UUID photoId,
        @Param("roomId") UUID roomId,
        @Param("userId") UUID userId,
        @Param("similarityScore") float similarityScore,
        @Param("createdAt") Instant createdAt
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM PhotoUserMatch pum WHERE pum.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") UUID roomId);
}
