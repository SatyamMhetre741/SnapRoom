package com.snaproom.repository;

import com.snaproom.entity.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {

    Optional<RoomMember> findByRoomIdAndUserId(UUID roomId, UUID userId);

    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    long countByRoomId(UUID roomId);

    List<RoomMember> findByRoomId(UUID roomId);

    List<RoomMember> findByRoomIdAndApprovalStatus(UUID roomId, String approvalStatus);

    @Query(value = """
        SELECT rm.user_id AS userId,
               CAST((1 - (rm.embedding <=> CAST(:probeVector AS vector))) AS REAL) AS similarityScore
        FROM room_members rm
        WHERE rm.room_id = :roomId
          AND (1 - (rm.embedding <=> CAST(:probeVector AS vector))) >= :threshold
        """, nativeQuery = true)
    List<MemberMatchProjection> findMatchingMembersInRoom(
        @Param("roomId") UUID roomId,
        @Param("probeVector") String probeVector,
        @Param("threshold") double threshold
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM RoomMember rm WHERE rm.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") UUID roomId);
}

