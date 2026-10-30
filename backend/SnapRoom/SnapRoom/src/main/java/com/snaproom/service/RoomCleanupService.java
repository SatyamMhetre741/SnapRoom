package com.snaproom.service;

import com.snaproom.entity.Photo;
import com.snaproom.entity.Room;
import com.snaproom.repository.PhotoRepository;
import com.snaproom.repository.PhotoUserMatchRepository;
import com.snaproom.repository.RoomMemberRepository;
import com.snaproom.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomCleanupService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final PhotoRepository photoRepository;
    private final PhotoUserMatchRepository photoUserMatchRepository;
    private final StorageService storageService;

    /**
     * Periodic background task that purges expired rooms and completely deletes
     * all associated photos from S3/R2 storage and all records from PostgreSQL.
     * Defaults to running every 30 minutes.
     */
    @Scheduled(
        fixedRateString = "${room.cleanup.fixed-rate-ms:1800000}",
        initialDelayString = "${room.cleanup.initial-delay-ms:60000}"
    )
    public void cleanupExpiredRooms() {
        Instant now = Instant.now();
        List<Room> expiredRooms = roomRepository.findByExpiresAtBefore(now);

        if (expiredRooms.isEmpty()) {
            log.debug("No expired rooms to purge at {}", now);
            return;
        }

        log.info("Found {} expired room(s) to purge at {}", expiredRooms.size(), now);

        for (Room room : expiredRooms) {
            try {
                purgeRoom(room);
            } catch (Exception ex) {
                log.error("Failed to purge expired room '{}' (id: {}): {}", room.getName(), room.getId(), ex.getMessage(), ex);
            }
        }
    }

    /**
     * Completely purges a room by ID from both storage and database.
     */
    @Transactional
    public void purgeRoom(Room room) {
        UUID roomId = room.getId();
        log.info("Purging room '{}' (id: {}, expired at: {})", room.getName(), roomId, room.getExpiresAt());

        // 1. Gather all photo object keys before removing records from database
        List<Photo> photos = photoRepository.findByRoomId(roomId);
        List<String> objectKeys = photos.stream().map(Photo::getObjectKey).toList();

        // 2. Delete all image files from S3-compatible storage
        if (!objectKeys.isEmpty()) {
            storageService.deleteObjects(objectKeys);
        }
        // Also wipe all objects under the room's prefix to catch unprocessed presigned uploads
        storageService.deleteObjectsWithPrefix("rooms/" + roomId + "/");

        // 3. Delete database records in relational order to respect foreign keys
        photoUserMatchRepository.deleteByRoomId(roomId);
        photoRepository.deleteByRoomId(roomId);
        roomMemberRepository.deleteByRoomId(roomId);
        roomRepository.delete(room);

        log.info("Successfully purged room '{}' (id: {}) with {} photo(s) from storage and database",
                room.getName(), roomId, photos.size());
    }

    @Transactional
    public void purgeRoomById(UUID roomId) {
        roomRepository.findById(roomId).ifPresent(this::purgeRoom);
    }
}
