package com.snaproom.service;

import com.snaproom.entity.Photo;
import com.snaproom.entity.Room;
import com.snaproom.entity.User;
import com.snaproom.repository.PhotoRepository;
import com.snaproom.repository.PhotoUserMatchRepository;
import com.snaproom.repository.RoomMemberRepository;
import com.snaproom.repository.RoomRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomCleanupServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private PhotoRepository photoRepository;

    @Mock
    private PhotoUserMatchRepository photoUserMatchRepository;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private RoomCleanupService roomCleanupService;

    @Test
    @DisplayName("cleanupExpiredRooms should find expired rooms, delete S3 objects and database rows")
    void testCleanupExpiredRoomsSuccess() {
        UUID roomId = UUID.randomUUID();
        User leader = User.builder().id(UUID.randomUUID()).email("leader@snaproom.local").displayName("Leader").build();

        Room expiredRoom = Room.builder()
                .id(roomId)
                .name("Expired Party")
                .inviteCode("expired-code")
                .leader(leader)
                .createdAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .expiresAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();

        Photo photo1 = Photo.builder()
                .id(UUID.randomUUID())
                .room(expiredRoom)
                .objectKey("rooms/" + roomId + "/photo1.jpg")
                .fileName("photo1.jpg")
                .build();

        when(roomRepository.findByExpiresAtBefore(any(Instant.class))).thenReturn(List.of(expiredRoom));
        when(photoRepository.findByRoomId(roomId)).thenReturn(List.of(photo1));

        roomCleanupService.cleanupExpiredRooms();

        // Verify S3 deletion
        verify(storageService).deleteObjects(List.of("rooms/" + roomId + "/photo1.jpg"));
        verify(storageService).deleteObjectsWithPrefix("rooms/" + roomId + "/");

        // Verify DB deletion in relational order
        verify(photoUserMatchRepository).deleteByRoomId(roomId);
        verify(photoRepository).deleteByRoomId(roomId);
        verify(roomMemberRepository).deleteByRoomId(roomId);
        verify(roomRepository).delete(expiredRoom);
    }

    @Test
    @DisplayName("cleanupExpiredRooms should do nothing when no rooms have expired")
    void testCleanupNoExpiredRooms() {
        when(roomRepository.findByExpiresAtBefore(any(Instant.class))).thenReturn(Collections.emptyList());

        roomCleanupService.cleanupExpiredRooms();

        verifyNoInteractions(photoRepository);
        verifyNoInteractions(storageService);
        verifyNoInteractions(photoUserMatchRepository);
        verifyNoInteractions(roomMemberRepository);
    }

    @Test
    @DisplayName("purgeRoomById should find room and purge all S3 files and DB rows")
    void testPurgeRoomById() {
        UUID roomId = UUID.randomUUID();
        User leader = User.builder().id(UUID.randomUUID()).email("leader@snaproom.local").displayName("Leader").build();

        Room room = Room.builder()
                .id(roomId)
                .name("To Delete")
                .inviteCode("to-delete")
                .leader(leader)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(2, ChronoUnit.DAYS))
                .build();

        when(roomRepository.findById(roomId)).thenReturn(java.util.Optional.of(room));
        when(photoRepository.findByRoomId(roomId)).thenReturn(Collections.emptyList());

        roomCleanupService.purgeRoomById(roomId);

        verify(storageService).deleteObjectsWithPrefix("rooms/" + roomId + "/");
        verify(photoUserMatchRepository).deleteByRoomId(roomId);
        verify(photoRepository).deleteByRoomId(roomId);
        verify(roomMemberRepository).deleteByRoomId(roomId);
        verify(roomRepository).delete(room);
    }
}
