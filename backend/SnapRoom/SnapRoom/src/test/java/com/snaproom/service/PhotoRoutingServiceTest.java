package com.snaproom.service;

import com.snaproom.repository.PhotoRepository;
import com.snaproom.repository.PhotoUserMatchRepository;
import com.snaproom.repository.RoomMemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhotoRoutingServiceTest {

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private StorageService storageService;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private PhotoRepository photoRepository;

    @Mock
    private PhotoUserMatchRepository photoUserMatchRepository;

    @InjectMocks
    private PhotoRoutingService photoRoutingService;

    @Test
    @DisplayName("extractSingleFaceForEnrollment throws IllegalArgumentException when no face detected")
    void testExtractFaceNoFaceDetected() {
        when(aiServiceClient.extractFaces(any(), any())).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> photoRoutingService.extractSingleFaceForEnrollment(new byte[]{1, 2, 3}, "selfie.jpg"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No face detected in selfie");
    }

    @Test
    @DisplayName("extractSingleFaceForEnrollment returns 512-D float[] on successful face detection")
    void testExtractFaceSuccess() {
        List<Float> embedding512 = new ArrayList<>(512);
        for (int i = 0; i < 512; i++) {
            embedding512.add(0.05f);
        }

        AiServiceClient.FaceDetail face = new AiServiceClient.FaceDetail(
                0.99f,
                List.of(10, 10, 100, 100),
                embedding512
        );

        when(aiServiceClient.extractFaces(any(), eq("selfie.jpg"))).thenReturn(List.of(face));

        float[] result = photoRoutingService.extractSingleFaceForEnrollment(new byte[]{1, 2, 3}, "selfie.jpg");

        assertThat(result).isNotNull();
        assertThat(result.length).isEqualTo(512);
        assertThat(result[0]).isEqualTo(0.05f);
    }
}
