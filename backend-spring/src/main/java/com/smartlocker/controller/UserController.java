package com.smartlocker.controller;

import com.smartlocker.dto.ApiResponse;
import com.smartlocker.dto.ChangePasswordRequest;
import com.smartlocker.dto.UpdateProfileRequest;
import com.smartlocker.dto.UserSummaryDto;
import com.smartlocker.security.UserPrincipal;
import com.smartlocker.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryDto>> getProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        UserSummaryDto user = userService.getUserProfile(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", user));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryDto>> updateProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserSummaryDto updated = userService.updateProfile(userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }
}
