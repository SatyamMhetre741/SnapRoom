package com.snaproom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class SnapRoomApplication {

    public static void main(String[] args) {
        loadEnvIfPresent();
        SpringApplication.run(SnapRoomApplication.class, args);
    }

    private static void loadEnvIfPresent() {
        List<Path> candidates = List.of(
                Path.of(".env"),
                Path.of("../../.env"),
                Path.of("../.env"),
                Path.of("../../../.env")
        );
        for (Path path : candidates) {
            if (Files.exists(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (!trimmed.isEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
                            int idx = trimmed.indexOf('=');
                            String key = trimmed.substring(0, idx).trim();
                            String value = trimmed.substring(idx + 1).trim();
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                    break;
                } catch (Exception ignored) {
                }
            }
        }
    }
}
