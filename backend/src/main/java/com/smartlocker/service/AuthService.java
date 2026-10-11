package com.smartlocker.service;

import com.smartlocker.dto.AuthResponse;
import com.smartlocker.dto.LoginRequest;
import com.smartlocker.dto.RegisterRequest;
import com.smartlocker.dto.UserSummaryDto;
import com.smartlocker.entity.User;
import com.smartlocker.exception.BadRequestException;
import com.smartlocker.repository.UserRepository;
import com.smartlocker.security.JwtUtils;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("An account with this email address already exists.");
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        User user = new User(request.getFullName().trim(), normalizedEmail, hashedPassword, "ROLE_USER");
        User savedUser = userRepository.save(user);

        String token = jwtUtils.generateToken(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getRole()
        );

        return new AuthResponse(
                "Account created successfully.",
                token,
                UserSummaryDto.fromEntity(savedUser)
        );
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        String token = jwtUtils.generateToken(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );

        return new AuthResponse(
                "Login successful.",
                token,
                UserSummaryDto.fromEntity(user)
        );
    }
}
