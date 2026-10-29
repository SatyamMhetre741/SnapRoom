package com.snaproom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresignUploadRequest {

    @NotBlank(message = "fileName is required")
    private String fileName;

    private String contentType;
}
