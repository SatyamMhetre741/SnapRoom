package com.snaproom.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.snaproom.dto.AuthRequest;
import com.snaproom.dto.AuthResponse;
import com.snaproom.dto.UserDto;
import com.snaproom.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    @Test
    @DisplayName("POST /api/auth/register should create user and return 201 Created")
    void testRegisterUser() throws Exception {
        UUID userId = UUID.randomUUID();
        UserDto userDto = new UserDto(userId, "alex@snaproom.local", "Alex Smith", Instant.now());
        AuthResponse authResponse = new AuthResponse("mock-jwt-token", userDto);

        when(authService.register(any(AuthRequest.class))).thenReturn(authResponse);

        AuthRequest request = AuthRequest.builder()
                .email("alex@snaproom.local")
                .password("securePassword123")
                .displayName("Alex Smith")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("mock-jwt-token"))
                .andExpect(jsonPath("$.user.email").value("alex@snaproom.local"))
                .andExpect(jsonPath("$.user.displayName").value("Alex Smith"));
    }

    @Test
    @DisplayName("POST /api/auth/login should return 200 OK with token")
    void testLoginUser() throws Exception {
        UUID userId = UUID.randomUUID();
        UserDto userDto = new UserDto(userId, "alex@snaproom.local", "Alex Smith", Instant.now());
        AuthResponse authResponse = new AuthResponse("mock-jwt-token-login", userDto);

        when(authService.login(any(AuthRequest.class))).thenReturn(authResponse);

        AuthRequest request = AuthRequest.builder()
                .email("alex@snaproom.local")
                .password("securePassword123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-jwt-token-login"))
                .andExpect(jsonPath("$.user.email").value("alex@snaproom.local"));
    }
}
