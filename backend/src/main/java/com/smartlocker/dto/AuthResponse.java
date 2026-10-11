package com.smartlocker.dto;

public class AuthResponse {

    private String message;
    private String token;
    private String tokenType = "Bearer";
    private UserSummaryDto user;

    public AuthResponse() {
    }

    public AuthResponse(String message, String token, UserSummaryDto user) {
        this.message = message;
        this.token = token;
        this.tokenType = "Bearer";
        this.user = user;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public UserSummaryDto getUser() {
        return user;
    }

    public void setUser(UserSummaryDto user) {
        this.user = user;
    }
}
