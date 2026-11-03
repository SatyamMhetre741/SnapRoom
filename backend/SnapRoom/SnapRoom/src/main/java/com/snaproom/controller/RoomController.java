package com.snaproom.controller;

import com.snaproom.dto.*;
import com.snaproom.security.UserPrincipal;
import com.snaproom.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    /**
     * POST /api/rooms: Creates a room, assigns creator as LEADER.
     */
    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        RoomResponse response = roomService.createRoom(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/rooms/{roomId}: Returns room details, member and photo counts, and current user role.
     */
    @GetMapping("/{roomId}")
    public ResponseEntity<RoomResponse> getRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID currentUserId = principal != null ? principal.getId() : null;
        RoomResponse response = roomService.getRoom(roomId, currentUserId);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/rooms/invite/{inviteCode}: Resolves room information for enrollment preview.
     */
    @GetMapping("/invite/{inviteCode}")
    public ResponseEntity<RoomResponse> getRoomByInviteCode(
            @PathVariable String inviteCode,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID currentUserId = principal != null ? principal.getId() : null;
        RoomResponse response = roomService.getRoomByInviteCode(inviteCode, currentUserId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/rooms/{inviteCode}/enroll: Accepts selfie webcam capture, extracts 512-D face embedding,
     * saves RoomMember, and discards image bytes immediately.
     */
    @PostMapping(value = "/{inviteCode}/enroll", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EnrollmentResponse> enroll(
            @PathVariable String inviteCode,
            @RequestParam("selfie") MultipartFile selfie,
            @AuthenticationPrincipal UserPrincipal principal
    ) throws IOException {
        if (selfie.isEmpty()) {
            throw new IllegalArgumentException("Selfie file is required for face enrollment.");
        }
        EnrollmentResponse response = roomService.enrollMember(inviteCode, selfie, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/rooms/{roomId}/presign-upload: Generates 5-minute presigned PUT URL and objectKey.
     */
    @PostMapping("/{roomId}/presign-upload")
    public ResponseEntity<PresignUploadResponse> presignUpload(
            @PathVariable UUID roomId,
            @Valid @RequestBody PresignUploadRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        PresignUploadResponse response = roomService.createPresignedUploadUrl(roomId, request, principal.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/rooms/{roomId}/process-photos: Registers uploaded object keys as PENDING,
     * triggers background async AI face routing, and immediately returns 202 Accepted.
     */
    @PostMapping("/{roomId}/process-photos")
    public ResponseEntity<Void> processPhotos(
            @PathVariable UUID roomId,
            @RequestBody ProcessPhotosRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<String> objectKeys = (request != null && request.getObjectKeys() != null)
                ? request.getObjectKeys()
                : Collections.emptyList();

        UUID uploaderId = principal != null ? principal.getId() : null;
        roomService.registerAndTriggerProcessing(roomId, objectKeys, uploaderId);

        return ResponseEntity.accepted().build();
    }

    /**
     * GET /api/rooms/{roomId}/status: Polls photo processing counts and progress status.
     */
    @GetMapping("/{roomId}/status")
    public ResponseEntity<RoomStatusResponse> getRoomStatus(@PathVariable UUID roomId) {
        RoomStatusResponse response = roomService.getRoomStatus(roomId);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/rooms/{roomId}/photos/me: Returns matched photos for the authenticated user with 1-hr presigned GET URLs.
     */
    @GetMapping("/{roomId}/photos/me")
    public ResponseEntity<List<PhotoItemResponse>> getMyPhotos(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<PhotoItemResponse> photos = roomService.getMyPhotos(roomId, principal.getId());
        return ResponseEntity.ok(photos);
    }

    /**
     * GET /api/rooms/{roomId}/photos: Returns all event gallery photos with 1-hr presigned GET URLs.
     */
    @GetMapping("/{roomId}/photos")
    public ResponseEntity<List<PhotoItemResponse>> getAllPhotos(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<PhotoItemResponse> photos = roomService.getAllPhotos(roomId, principal.getId());
        return ResponseEntity.ok(photos);
    }

    /**
     * POST /api/rooms/{roomId}/download-zip: Streams selected S3 objects through ZipOutputStream (Deflater.BEST_SPEED, 8KB buffer).
     */
    @PostMapping("/{roomId}/download-zip")
    public ResponseEntity<StreamingResponseBody> downloadZip(
            @PathVariable UUID roomId,
            @RequestBody DownloadZipRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<DownloadItemDto> items = (request != null && request.getItems() != null)
                ? request.getItems()
                : Collections.emptyList();

        StreamingResponseBody responseBody = outputStream -> {
            roomService.streamZipArchive(roomId, items, principal.getId(), outputStream);
        };

        String filename = "snaproom-" + roomId + ".zip";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(responseBody);
    }

    /**
     * DELETE /api/rooms/{roomId}: Explicitly deletes a room, all its photos from S3/R2 storage, and all records from database.
     * Allowed only for the room LEADER.
     */
    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> deleteRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        roomService.deleteRoom(roomId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
