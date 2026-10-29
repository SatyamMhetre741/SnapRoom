package com.snaproom.repository;

import com.snaproom.entity.Photo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, UUID> {

    List<Photo> findByRoomIdOrderByCreatedAtDesc(UUID roomId);

    List<Photo> findByRoomIdAndObjectKeyIn(UUID roomId, List<String> objectKeys);

    Optional<Photo> findByRoomIdAndObjectKey(UUID roomId, String objectKey);

    long countByRoomId(UUID roomId);

    long countByRoomIdAndStatus(UUID roomId, String status);
}
