package com.snaproom.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Value("${ai.service.url:http://localhost:8001}")
    private String aiServiceUrl;

    @Bean(name = "photoTaskExecutor")
    public Executor photoTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("PhotoWorker-");
        executor.initialize();
        return executor;
    }

    @Bean
    public RestClient restClient() {
        return RestClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }
}
