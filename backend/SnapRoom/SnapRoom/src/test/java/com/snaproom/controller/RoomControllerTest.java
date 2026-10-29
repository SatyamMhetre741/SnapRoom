package com.snaproom.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.snaproom.dto.CreateRoomRequest;
import com.snaproom.dto.RoomResponse;
import com.snaproom.dto.RoomStatusResponse;
import com.snaproom.security.UserPrincipal;
import com.snaproom.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class RoomControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private RoomService roomService;

    @InjectMocks
    private RoomController roomController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(roomController)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("POST /api/rooms should create room and return 201 Created")
    void testCreateRoom() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        UserPrincipal principal = new UserPrincipal(userId, "leader@snaproom.local", "Leader User", "");
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        RoomResponse response = new RoomResponse(
                roomId,
                "fest-2026",
                "Tech Gala 2026",
                userId,
                Instant.now(),
                1,
                0,
                "LEADER"
        );

        when(roomService.createRoom(any(CreateRoomRequest.class), eq(userId))).thenReturn(response);

        CreateRoomRequest request = CreateRoomRequest.builder()
                .name("Tech Gala 2026")
                .build();

        mockMvc.perform(post("/api/rooms")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(roomId.toString()))
                .andExpect(jsonPath("$.inviteCode").value("fest-2026"))
                .andExpect(jsonPath("$.userRole").value("LEADER"));
    }

    @Test
    @DisplayName("GET /api/rooms/invite/{inviteCode} should return room preview")
    void testGetRoomByInviteCode() throws Exception {
        UUID roomId = UUID.randomUUID();
        UUID leaderId = UUID.randomUUID();

        RoomResponse response = new RoomResponse(
                roomId,
                "party-demo",
                "Birthday Bash",
                leaderId,
                Instant.now(),
                5,
                18,
                "MEMBER"
        );

        when(roomService.getRoomByInviteCode(eq("party-demo"), any())).thenReturn(response);

        mockMvc.perform(get("/api/rooms/invite/party-demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Birthday Bash"))
                .andExpect(jsonPath("$.inviteCode").value("party-demo"))
                .andExpect(jsonPath("$.memberCount").value(5))
                .andExpect(jsonPath("$.photoCount").value(18));
    }

    @Test
    @DisplayName("GET /api/rooms/{roomId}/status should return processing counts")
    void testGetRoomStatus() throws Exception {
        UUID roomId = UUID.randomUUID();
        RoomStatusResponse statusResponse = new RoomStatusResponse(20, 2, 3, 15, 0, true);

        when(roomService.getRoomStatus(roomId)).thenReturn(statusResponse);

        mockMvc.perform(get("/api/rooms/" + roomId + "/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPhotos").value(20))
                .andExpect(jsonPath("$.pendingCount").value(2))
                .andExpect(jsonPath("$.processingCount").value(3))
                .andExpect(jsonPath("$.completedCount").value(15))
                .andExpect(jsonPath("$.isProcessing").value(true));
    }
}
