# ========================================================
# Dockerfile for Spring Boot Backend on Render.com
# Multi-stage build for fast, lightweight production image
# ========================================================

# Stage 1: Build the JAR with Maven & Eclipse Temurin JDK 21
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy POM and download dependencies for cache efficiency
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build production package
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Runtime Image with lightweight JRE 21
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create directory for file uploads
RUN mkdir -p /app/uploads

# Copy packaged JAR from builder stage
COPY --from=builder /app/target/smart-digital-locker-backend-1.0.0.jar app.jar

# Render assigns dynamic PORT environment variable (default 8080)
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
