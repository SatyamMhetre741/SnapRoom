package com.snaproom.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceClient {

    private final RestClient restClient;

    public record FaceDetail(
            float confidence,
            List<Integer> bbox,
            List<Float> embedding
    ) {}

    public record FaceExtractionResponse(
            @JsonProperty("face_count") int faceCount,
            List<FaceDetail> faces
    ) {}

    /**
     * Sends image bytes to the FastAPI /extract-faces endpoint using RestClient.
     * Uses a custom ByteArrayResource overriding getFilename() to satisfy FastAPI UploadFile.
     */
    public List<FaceDetail> extractFaces(byte[] imageBytes, String fileName) {
        if (imageBytes == null || imageBytes.length == 0) {
            return Collections.emptyList();
        }

        ByteArrayResource resource = new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return (fileName != null && !fileName.isBlank()) ? fileName : "image.jpg";
            }
        };

        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("file", resource, MediaType.APPLICATION_OCTET_STREAM);

        try {
            FaceExtractionResponse response = restClient.post()
                    .uri("/extract-faces")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(bodyBuilder.build())
                    .retrieve()
                    .body(FaceExtractionResponse.class);

            if (response != null && response.faces() != null) {
                return response.faces();
            }
        } catch (Exception e) {
            log.error("Failed to extract faces via AI service: {}", e.getMessage());
            throw new RuntimeException("AI face extraction failed: " + e.getMessage(), e);
        }

        return Collections.emptyList();
    }
}
