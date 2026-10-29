package com.snaproom.service;

import com.snaproom.dto.*;
import com.snaproom.entity.Photo;
import com.snaproom.entity.PhotoUserMatch;
import com.snaproom.entity.Room;
import com.snaproom.entity.RoomMember;
import com.snaproom.entity.User;
import com.snaproom.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.io.OutputStream;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final PhotoRepository photoRepository;
    private final PhotoUserMatchRepository photoUserMatchRepository;
    private final UserRepository userRepository;
    private final PhotoRoutingService photoRoutingService;
    private final StorageService storageService;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String INVITE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request, UUID leaderId) {
        User leader = userRepository.findById(leaderId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + leaderId));

        String inviteCode = generateUniqueInviteCode();

        Room room = Room.builder()
                .name(request.getName().trim())
                .inviteCode(inviteCode)
                .leader(leader)
                .build();

        Room savedRoom = roomRepository.save(room);

        return mapToRoomResponse(savedRoom, leaderId);
    }

    public RoomResponse getRoom(UUID roomId, UUID currentUserId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));

        return mapToRoomResponse(room, currentUserId);
    }

    public RoomResponse getRoomByInviteCode(String inviteCode, UUID currentUserId) {
        Room room = roomRepository.findByInviteCode(inviteCode.toLowerCase().trim())
                .orElseThrow(() -> new NoSuchElementException("Room not found with invite code: " + inviteCode));

        return mapToRoomResponse(room, currentUserId);
    }

    @Transactional
    public EnrollmentResponse enrollMember(String inviteCode, MultipartFile selfie, UUID userId) throws IOException {
        Room room = roomRepository.findByInviteCode(inviteCode.toLowerCase().trim())
                .orElseThrow(() -> new NoSuchElementException("Room not found with invite code: " + inviteCode));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));

        // 1. Extract 512-D facial embedding via Python FastAPI service
        byte[] selfieBytes = selfie.getBytes();
        float[] embedding = photoRoutingService.extractSingleFaceForEnrollment(selfieBytes, selfie.getOriginalFilename());

        // 2. Determine member role
        boolean isLeader = room.getLeader().getId().equals(user.getId());
        String role = isLeader ? "LEADER" : "MEMBER";

        // 3. Upsert RoomMember record (image bytes discarded immediately)
        Optional<RoomMember> existingMember = roomMemberRepository.findByRoomIdAndUserId(room.getId(), user.getId());
        RoomMember member;
        if (existingMember.isPresent()) {
            member = existingMember.get();
            member.setEmbedding(embedding);
            member.setRole(role);
        } else {
            member = RoomMember.builder()
                    .room(room)
                    .user(user)
                    .role(role)
                    .embedding(embedding)
                    .build();
        }

        RoomMember savedMember = roomMemberRepository.save(member);

        return new EnrollmentResponse(
                savedMember.getId(),
                room.getId(),
                savedMember.getRole(),
                savedMember.getEnrolledAt(),
                "Face enrolled successfully! 512-D embedding extracted."
        );
    }

    public PresignUploadResponse createPresignedUploadUrl(UUID roomId, PresignUploadRequest request) {
        if (!roomRepository.existsById(roomId)) {
            throw new NoSuchElementException("Room not found: " + roomId);
        }

        String rawFileName = request.getFileName() != null ? request.getFileName() : "photo.jpg";
        String sanitized = rawFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String objectKey = "rooms/" + roomId + "/" + UUID.randomUUID() + "-" + sanitized;

        String contentType = request.getContentType() != null && !request.getContentType().isBlank()
                ? request.getContentType()
                : "image/jpeg";

        // 5-minute presigned PUT URL
        String uploadUrl = storageService.generatePresignedPutUrl(objectKey, contentType, Duration.ofMinutes(5));

        return new PresignUploadResponse(objectKey, uploadUrl, rawFileName);
    }

    @Transactional
    public List<Photo> registerAndTriggerProcessing(UUID roomId, List<String> objectKeys, UUID uploaderId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + roomId));

        User uploader = uploaderId != null ? userRepository.findById(uploaderId).orElse(null) : null;

        List<Photo> createdPhotos = new ArrayList<>();
        for (String objectKey : objectKeys) {
            if (objectKey == null || objectKey.isBlank()) continue;

            Optional<Photo> existing = photoRepository.findByRoomIdAndObjectKey(roomId, objectKey);
            if (existing.isPresent()) {
                Photo p = existing.get();
                p.setStatus("PENDING");
                createdPhotos.add(photoRepository.save(p));
            } else {
                String fileName = objectKey.substring(objectKey.lastIndexOf('/') + 1);
                // Strip UUID prefix if present
                if (fileName.contains("-")) {
                    fileName = fileName.substring(fileName.indexOf('-') + 1);
                }

                Photo photo = Photo.builder()
                        .room(room)
                        .uploader(uploader)
                        .objectKey(objectKey)
                        .fileName(fileName)
                        .status("PENDING")
                        .build();

                createdPhotos.add(photoRepository.save(photo));
            }
        }

        // Trigger background processing asynchronously on photoTaskExecutor
        photoRoutingService.processRoomPhotosAsync(roomId, createdPhotos);

        return createdPhotos;
    }

    public RoomStatusResponse getRoomStatus(UUID roomId) {
        long total = photoRepository.countByRoomId(roomId);
        long pending = photoRepository.countByRoomIdAndStatus(roomId, "PENDING");
        long processing = photoRepository.countByRoomIdAndStatus(roomId, "PROCESSING");
        long completed = photoRepository.countByRoomIdAndStatus(roomId, "COMPLETED");
        long failed = photoRepository.countByRoomIdAndStatus(roomId, "FAILED");

        boolean isProcessing = (pending + processing) > 0;

        return new RoomStatusResponse(total, pending, processing, completed, failed, isProcessing);
    }

    public List<PhotoItemResponse> getMyPhotos(UUID roomId, UUID userId) {
        List<PhotoUserMatch> matches = photoUserMatchRepository.findByRoomIdAndUserIdOrderByCreatedAtDesc(roomId, userId);

        return matches.stream().map(match -> {
            Photo photo = match.getPhoto();
            String presignedUrl = storageService.generatePresignedGetUrl(photo.getObjectKey(), Duration.ofHours(1));

            return new PhotoItemResponse(
                    photo.getId(),
                    photo.getRoom().getId(),
                    photo.getUploader() != null ? photo.getUploader().getId() : null,
                    photo.getObjectKey(),
                    photo.getFileName(),
                    photo.getStatus(),
                    presignedUrl,
                    match.getSimilarityScore(),
                    photo.getCreatedAt()
            );
        }).toList();
    }

    public List<PhotoItemResponse> getAllPhotos(UUID roomId) {
        List<Photo> photos = photoRepository.findByRoomIdOrderByCreatedAtDesc(roomId);

        return photos.stream().map(photo -> {
            String presignedUrl = storageService.generatePresignedGetUrl(photo.getObjectKey(), Duration.ofHours(1));

            return new PhotoItemResponse(
                    photo.getId(),
                    photo.getRoom().getId(),
                    photo.getUploader() != null ? photo.getUploader().getId() : null,
                    photo.getObjectKey(),
                    photo.getFileName(),
                    photo.getStatus(),
                    presignedUrl,
                    null,
                    photo.getCreatedAt()
            );
        }).toList();
    }

    /**
     * Streams S3 objects directly through a ZipOutputStream with Deflater.BEST_SPEED and 8KB buffer.
     * Never loads archives in memory.
     */
    public void streamZipArchive(UUID roomId, List<DownloadItemDto> items, OutputStream outputStream) throws IOException {
        try (ZipOutputStream zipOut = new ZipOutputStream(outputStream)) {
            zipOut.setLevel(Deflater.BEST_SPEED);
            byte[] buffer = new byte[8192];
            Set<String> usedFileNames = new HashSet<>();

            for (DownloadItemDto item : items) {
                if (item.objectKey() == null || item.objectKey().isBlank()) continue;

                String baseName = item.fileName() != null && !item.fileName().isBlank()
                        ? item.fileName()
                        : item.objectKey().substring(item.objectKey().lastIndexOf('/') + 1);

                // Prevent duplicate zip entry names
                String entryName = baseName;
                int counter = 1;
                while (usedFileNames.contains(entryName)) {
                    int dot = baseName.lastIndexOf('.');
                    if (dot > 0) {
                        entryName = baseName.substring(0, dot) + "_" + counter + baseName.substring(dot);
                    } else {
                        entryName = baseName + "_" + counter;
                    }
                    counter++;
                }
                usedFileNames.add(entryName);

                try {
                    ResponseInputStream<GetObjectResponse> s3Stream = storageService.getObjectInputStream(item.objectKey());
                    zipOut.putNextEntry(new ZipEntry(entryName));

                    try (s3Stream) {
                        int bytesRead;
                        while ((bytesRead = s3Stream.read(buffer)) != -1) {
                            zipOut.write(buffer, 0, bytesRead);
                        }
                    }
                    zipOut.closeEntry();
                } catch (Exception ex) {
                    log.warn("Could not include object {} in zip: {}", item.objectKey(), ex.getMessage());
                }
            }
            zipOut.finish();
        }
    }

    private RoomResponse mapToRoomResponse(Room room, UUID currentUserId) {
        long memberCount = roomMemberRepository.countByRoomId(room.getId());
        long photoCount = photoRepository.countByRoomId(room.getId());

        String userRole = "MEMBER";
        if (currentUserId != null) {
            if (room.getLeader().getId().equals(currentUserId)) {
                userRole = "LEADER";
            } else {
                Optional<RoomMember> member = roomMemberRepository.findByRoomIdAndUserId(room.getId(), currentUserId);
                if (member.isPresent()) {
                    userRole = member.get().getRole();
                }
            }
        }

        return new RoomResponse(
                room.getId(),
                room.getInviteCode(),
                room.getName(),
                room.getLeader().getId(),
                room.getCreatedAt(),
                memberCount,
                photoCount,
                userRole
        );
    }

    private String generateUniqueInviteCode() {
        for (int i = 0; i < 10; i++) {
            StringBuilder sb = new StringBuilder(8);
            for (int j = 0; j < 8; j++) {
                sb.append(INVITE_CHARS.charAt(RANDOM.nextInt(INVITE_CHARS.length())));
            }
            String code = sb.toString();
            if (roomRepository.findByInviteCode(code).isEmpty()) {
                return code;
            }
        }
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
