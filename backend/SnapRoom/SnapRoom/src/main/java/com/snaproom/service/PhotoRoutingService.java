package com.snaproom.service;

import com.snaproom.entity.Photo;
import com.snaproom.repository.MemberMatchProjection;
import com.snaproom.repository.PhotoRepository;
import com.snaproom.repository.PhotoUserMatchRepository;
import com.snaproom.repository.RoomMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PhotoRoutingService {

    private final AiServiceClient aiServiceClient;
    private final StorageService storageService;
    private final RoomMemberRepository roomMemberRepository;
    private final PhotoRepository photoRepository;
    private final PhotoUserMatchRepository photoUserMatchRepository;

    private static final double SIMILARITY_THRESHOLD = 0.50;

    /**
     * Extracts a single 512-D face embedding from selfie bytes for room enrollment.
     * Throws IllegalArgumentException if no face is detected.
     */
    public float[] extractSingleFaceForEnrollment(byte[] selfieBytes, String fileName) {
        List<AiServiceClient.FaceDetail> faces = aiServiceClient.extractFaces(selfieBytes, fileName);

        if (faces.isEmpty()) {
            throw new IllegalArgumentException("No face detected in selfie. Please ensure good lighting and face the camera directly.");
        }

        // Select the face with highest detection confidence
        AiServiceClient.FaceDetail bestFace = faces.stream()
                .max(Comparator.comparingDouble(AiServiceClient.FaceDetail::confidence))
                .orElse(faces.get(0));

        List<Float> embeddingList = bestFace.embedding();
        if (embeddingList == null || embeddingList.size() != 512) {
            throw new IllegalStateException("AI service returned invalid embedding size: " + (embeddingList == null ? 0 : embeddingList.size()));
        }

        float[] vector = new float[512];
        for (int i = 0; i < 512; i++) {
            vector[i] = embeddingList.get(i);
        }
        return vector;
    }

    /**
     * Background task executed on photoTaskExecutor thread pool.
     * Downloads each photo, runs face extraction, queries pgvector for matches,
     * and idempotently upserts matches into photo_user_matches.
     */
    @Async("photoTaskExecutor")
    @Transactional
    public void processRoomPhotosAsync(UUID roomId, List<Photo> pendingPhotos) {
        log.info("Starting async face routing for {} photos in room {}", pendingPhotos.size(), roomId);

        for (Photo photo : pendingPhotos) {
            try {
                photo.setStatus("PROCESSING");
                photoRepository.save(photo);

                byte[] imageBytes = storageService.getObjectAsBytes(photo.getObjectKey());
                List<AiServiceClient.FaceDetail> faces = aiServiceClient.extractFaces(imageBytes, photo.getFileName());

                log.info("Photo {} (id: {}) has {} faces detected", photo.getFileName(), photo.getId(), faces.size());

                for (AiServiceClient.FaceDetail face : faces) {
                    List<Float> embedding = face.embedding();
                    if (embedding == null || embedding.isEmpty()) {
                        continue;
                    }

                    // Format as pgvector literal string: [0.0123,-0.0456,...]
                    String vectorLiteral = "[" + embedding.stream()
                            .map(Object::toString)
                            .collect(Collectors.joining(",")) + "]";

                    List<MemberMatchProjection> matches = roomMemberRepository.findMatchingMembersInRoom(
                            roomId,
                            vectorLiteral,
                            SIMILARITY_THRESHOLD
                    );

                    for (MemberMatchProjection match : matches) {
                        photoUserMatchRepository.upsertMatch(
                                UUID.randomUUID(),
                                photo.getId(),
                                roomId,
                                match.getUserId(),
                                match.getSimilarityScore(),
                                Instant.now()
                        );
                    }
                }

                photo.setStatus("COMPLETED");
                photoRepository.save(photo);
            } catch (Exception ex) {
                log.error("Failed to process photo {} (id: {}): {}", photo.getFileName(), photo.getId(), ex.getMessage(), ex);
                photo.setStatus("FAILED");
                photoRepository.save(photo);
            }
        }

        log.info("Completed async face routing for room {}", roomId);
    }
}
