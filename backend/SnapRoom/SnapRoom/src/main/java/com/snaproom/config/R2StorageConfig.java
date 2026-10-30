package com.snaproom.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Cloudflare R2 Object Storage Configuration.
 * Cloudflare R2 implements the S3-compatible API protocol.
 * The standard AWS SDK for Java v2 (software.amazon.awssdk:s3) connects directly
 * to the Cloudflare R2 endpoint: https://<account_id>.r2.cloudflarestorage.com.
 */
@Slf4j
@Configuration
public class R2StorageConfig {

    @Value("${storage.endpoint:${r2.endpoint:}}")
    private String endpoint;

    @Value("${storage.account-id:${r2.account-id:}}")
    private String accountId;

    @Value("${storage.region:${r2.region:auto}}")
    private String region;

    @Value("${storage.access-key-id:${r2.access-key-id:${aws.access-key-id:test}}}")
    private String accessKey;

    @Value("${storage.secret-access-key:${r2.secret-access-key:${aws.secret-access-key:test}}}")
    private String secretKey;

    private URI resolveEndpointUri() {
        if (endpoint != null && !endpoint.isBlank()) {
            return URI.create(endpoint);
        }
        if (accountId != null && !accountId.isBlank()) {
            return URI.create("https://" + accountId + ".r2.cloudflarestorage.com");
        }
        return null;
    }

    private Region resolveRegion() {
        if (region != null && !region.isBlank() && !region.equalsIgnoreCase("auto")) {
            return Region.of(region);
        }
        return Region.of("auto");
    }

    private StaticCredentialsProvider credentialsProvider() {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)
        );
    }

    @Bean
    public S3Client s3Client() {
        URI endpointUri = resolveEndpointUri();
        log.info("Configuring Cloudflare R2 client (endpoint: {}, region: {})", endpointUri, resolveRegion());

        S3ClientBuilder builder = S3Client.builder()
                .region(resolveRegion())
                .credentialsProvider(credentialsProvider())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build());

        if (endpointUri != null) {
            builder.endpointOverride(endpointUri);
        }

        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        URI endpointUri = resolveEndpointUri();
        log.info("Configuring Cloudflare R2 presigner (endpoint: {})", endpointUri);

        S3Presigner.Builder builder = S3Presigner.builder()
                .region(resolveRegion())
                .credentialsProvider(credentialsProvider())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build());

        if (endpointUri != null) {
            builder.endpointOverride(endpointUri);
        }

        return builder.build();
    }
}
