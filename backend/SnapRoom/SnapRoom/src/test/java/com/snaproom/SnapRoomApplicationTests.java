package com.snaproom;

import com.snaproom.service.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class SnapRoomApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StorageService storageService;

    @Autowired
    private S3Client s3Client;

    @Value("${storage.bucket-name:${r2.bucket-name:snaproom}}")
    private String bucketName;

    @Test
    void contextLoads() {
        assertNotNull(jdbcTemplate);
        assertNotNull(storageService);
        assertNotNull(s3Client);
    }

    @Test
    void testPgVectorExtensionAndOperations() {
        // 1. Verify extension exists
        String extVersion = jdbcTemplate.queryForObject(
                "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
                String.class
        );
        assertNotNull(extVersion, "pgvector extension must be installed in PostgreSQL");
        System.out.println("=================================================");
        System.out.println("pgvector extension version: " + extVersion);

        // 2. Test cosine distance operator <=>
        Double distance = jdbcTemplate.queryForObject(
                "SELECT ('[1,0,0]'::vector <=> '[0,1,0]'::vector)",
                Double.class
        );
        assertNotNull(distance);
        System.out.println("Cosine distance test result: " + distance);
        assertEquals(1.0, distance, 0.001, "Cosine distance between orthogonal vectors should be 1.0");

        // 3. Test L2 distance operator <->
        Double l2Distance = jdbcTemplate.queryForObject(
                "SELECT ('[1,2,3]'::vector <-> '[1,2,3]'::vector)",
                Double.class
        );
        assertNotNull(l2Distance);
        System.out.println("L2 distance test result: " + l2Distance);
        System.out.println("=================================================");
        assertEquals(0.0, l2Distance, 0.001, "L2 distance to identical vector should be 0.0");
    }

    @Test
    void testR2StorageIntegration() {
        System.out.println("=================================================");
        System.out.println("Testing Cloudflare R2 Storage integration...");
        System.out.println("Target bucket: " + bucketName);

        // 1. Test Presigned PUT URL generation
        String putUrl = storageService.generatePresignedPutUrl("rooms/test-room/test-photo.jpg", "image/jpeg", Duration.ofMinutes(15));
        assertNotNull(putUrl);
        assertTrue(putUrl.contains("r2.cloudflarestorage.com"), "Presigned URL must target Cloudflare R2");
        assertTrue(putUrl.contains(bucketName), "Presigned URL must reference bucket name");
        System.out.println("Presigned PUT URL generated successfully: " + putUrl.substring(0, Math.min(putUrl.length(), 100)) + "...");

        // 2. Test Presigned GET URL generation
        String getUrl = storageService.generatePresignedGetUrl("rooms/test-room/test-photo.jpg", Duration.ofMinutes(60));
        assertNotNull(getUrl);
        assertTrue(getUrl.contains("r2.cloudflarestorage.com"));
        assertTrue(getUrl.contains(bucketName));
        System.out.println("Presigned GET URL generated successfully: " + getUrl.substring(0, Math.min(getUrl.length(), 100)) + "...");

        // 3. Live check against Cloudflare R2 endpoint if network allows
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            System.out.println("Live Cloudflare R2 HeadBucket check: SUCCESSFUL");
        } catch (Exception ex) {
            System.out.println("Live HeadBucket check note (credentials or endpoint response): " + ex.getMessage());
        }
        System.out.println("=================================================");
    }

}
