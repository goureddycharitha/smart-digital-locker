package com.smartlocker.dto;

import com.smartlocker.entity.User;
import java.time.LocalDateTime;

public class UserSummaryDto {

    private Long id;
    private String fullName;
    private String email;
    private String role;
    private LocalDateTime createdAt;

    public UserSummaryDto() {
    }

    public UserSummaryDto(Long id, String fullName, String email, String role, LocalDateTime createdAt) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.createdAt = createdAt;
    }

    public static UserSummaryDto fromEntity(User user) {
        if (user == null) return null;
        return new UserSummaryDto(
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getRole(),
            user.getCreatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
