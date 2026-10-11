package com.smartlocker.dto;

import com.smartlocker.entity.Document;
import java.time.LocalDateTime;

public class DocumentDto {

    private Long id;
    private String title;
    private String description;
    private String category;
    private String originalFileName;
    private String mimeType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
    private LocalDateTime updatedAt;

    public DocumentDto() {
    }

    public DocumentDto(Long id, String title, String description, String category,
                       String originalFileName, String mimeType, Long fileSize,
                       LocalDateTime uploadedAt, LocalDateTime updatedAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.originalFileName = originalFileName;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.uploadedAt = uploadedAt;
        this.updatedAt = updatedAt;
    }

    public static DocumentDto fromEntity(Document doc) {
        if (doc == null) return null;
        return new DocumentDto(
            doc.getId(),
            doc.getTitle(),
            doc.getDescription(),
            doc.getCategory(),
            doc.getOriginalFileName(),
            doc.getMimeType(),
            doc.getFileSize(),
            doc.getUploadedAt(),
            doc.getUpdatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
