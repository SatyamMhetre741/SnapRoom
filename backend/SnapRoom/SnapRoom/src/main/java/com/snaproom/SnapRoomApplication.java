package com.snaproom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class SnapRoomApplication {

    public static void main(String[] args) {
        SpringApplication.run(SnapRoomApplication.class, args);
    }
}
