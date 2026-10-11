package com.smartlocker.controller;

import com.smartlocker.dto.ApiResponse;
import com.smartlocker.dto.AuthResponse;
import com.smartlocker.dto.LoginRequest;
import com.smartlocker.dto.RegisterRequest;
import com.smartlocker.dto.UserSummaryDto;
import com.smartlocker.security.UserPrincipal;
import com.smartlocker.service.AuthService;
import com.smartlocker.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryDto>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication required"));
        }
        UserSummaryDto user = userService.getUserProfile(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("User profile retrieved successfully", user));
    }
}
