package com.snaproom.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void testPgVectorOnStartup() {
        try {
            String vectorVersion = jdbcTemplate.queryForObject(
                    "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
                    String.class
            );
            Double distance = jdbcTemplate.queryForObject(
                    "SELECT ('[1,2,3]'::vector <=> '[1,2,3]'::vector)",
                    Double.class
            );
            log.info("==================================================================");
            log.info("DATABASE & PGVECTOR CONNECTIVITY: SUCCESS");
            log.info("Installed pgvector extension version: {}", vectorVersion);
            log.info("Vector cosine distance test result: {}", distance);
            log.info("==================================================================");
        } catch (Exception e) {
            log.error("Failed to verify pgvector connectivity on startup: {}", e.getMessage(), e);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("service", "snaproom-backend");

        try {
            String vectorVersion = jdbcTemplate.queryForObject(
                    "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
                    String.class
            );
            Double distance = jdbcTemplate.queryForObject(
                    "SELECT ('[1,2,3]'::vector <=> '[1,2,3]'::vector)",
                    Double.class
            );
            Map<String, Object> pgvectorInfo = new LinkedHashMap<>();
            pgvectorInfo.put("connected", true);
            pgvectorInfo.put("extensionVersion", vectorVersion);
            pgvectorInfo.put("cosineDistanceTest", distance != null && Math.abs(distance) < 0.0001 ? "PASSED" : "FAILED");

            response.put("pgvector", pgvectorInfo);
        } catch (Exception e) {
            Map<String, Object> errorInfo = new LinkedHashMap<>();
            errorInfo.put("connected", false);
            errorInfo.put("error", e.getMessage());
            response.put("pgvector", errorInfo);
        }

        return ResponseEntity.ok(response);
    }
}
