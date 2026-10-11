package com.smartlocker.service;

import com.smartlocker.dto.DocumentDto;
import com.smartlocker.dto.DocumentListResponse;
import com.smartlocker.dto.DocumentUpdateRequest;
import com.smartlocker.entity.Document;
import com.smartlocker.entity.User;
import com.smartlocker.exception.BadRequestException;
import com.smartlocker.exception.ResourceNotFoundException;
import com.smartlocker.repository.DocumentRepository;
import com.smartlocker.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    private static final Set<String> VALID_CATEGORIES = new HashSet<>(Arrays.asList(
            "Academic", "Identity", "Financial", "Medical", "Certificates", "Other"
    ));

    public DocumentService(DocumentRepository documentRepository,
                           UserRepository userRepository,
                           FileStorageService fileStorageService) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public DocumentDto uploadDocument(Long userId, MultipartFile file, String title, String category, String description) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (title == null || title.trim().isEmpty()) {
            throw new BadRequestException("Document title is required.");
        }
        if (title.trim().length() < 2 || title.trim().length() > 150) {
            throw new BadRequestException("Document title must be between 2 and 150 characters.");
        }

        String normalizedCategory = (category != null && !category.trim().isEmpty()) ? category.trim() : "Other";
        boolean isValidCategory = VALID_CATEGORIES.stream()
                .anyMatch(c -> c.equalsIgnoreCase(normalizedCategory));
        if (!isValidCategory) {
            throw new BadRequestException("Invalid category. Must be one of: " + VALID_CATEGORIES);
        }

        String storedFileName = fileStorageService.storeFile(file);

        String mimeType = file.getContentType();
        if (mimeType == null || mimeType.trim().isEmpty()) {
            mimeType = "application/octet-stream";
        }

        Document document = new Document(
                user,
                title.trim(),
                (description != null) ? description.trim() : null,
                normalizedCategory,
                file.getOriginalFilename(),
                storedFileName,
                mimeType,
                file.getSize()
        );

        Document saved = documentRepository.save(document);
        return DocumentDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public DocumentListResponse getDocuments(Long userId, String category, String search, int page, int limit) {
        int pageIndex = Math.max(0, page - 1);
        int pageSize = (limit > 0 && limit <= 100) ? limit : 10;

        Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "uploadedAt"));
        Page<Document> documentPage = documentRepository.searchDocuments(userId, category, search, pageable);

        List<DocumentDto> dtos = documentPage.getContent().stream()
                .map(DocumentDto::fromEntity)
                .collect(Collectors.toList());

        DocumentListResponse.PaginationDto pagination = new DocumentListResponse.PaginationDto(
                page,
                pageSize,
                documentPage.getTotalElements(),
                documentPage.getTotalPages()
        );

        Long totalBytes = documentRepository.sumFileSizeByUserId(userId);
        List<Object[]> catCounts = documentRepository.countByCategoryForUser(userId);
        Map<String, Long> categoryMap = new HashMap<>();
        for (Object[] row : catCounts) {
            String cat = (String) row[0];
            Long count = (Long) row[1];
            categoryMap.put(cat, count);
        }

        DocumentListResponse.SummaryDto summary = new DocumentListResponse.SummaryDto(
                (totalBytes != null) ? totalBytes : 0L,
                categoryMap
        );

        return new DocumentListResponse(dtos, pagination, summary);
    }

    @Transactional(readOnly = true)
    public DocumentDto getDocumentById(Long userId, Long docId) {
        Document doc = documentRepository.findByIdAndUserId(docId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found or access denied."));
        return DocumentDto.fromEntity(doc);
    }

    @Transactional
    public DocumentDto updateDocument(Long userId, Long docId, DocumentUpdateRequest request) {
        Document doc = documentRepository.findByIdAndUserId(docId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found or access denied."));

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            doc.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            doc.setDescription(request.getDescription().trim());
        }
        if (request.getCategory() != null && !request.getCategory().trim().isEmpty()) {
            String cat = request.getCategory().trim();
            boolean valid = VALID_CATEGORIES.stream().anyMatch(c -> c.equalsIgnoreCase(cat));
            if (!valid) {
                throw new BadRequestException("Invalid category. Must be one of: " + VALID_CATEGORIES);
            }
            doc.setCategory(cat);
        }

        Document updated = documentRepository.save(doc);
        return DocumentDto.fromEntity(updated);
    }

    public DownloadResult downloadDocument(Long userId, Long docId) {
        Document doc = documentRepository.findByIdAndUserId(docId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found or access denied."));

        Resource resource = fileStorageService.loadFileAsResource(doc.getStoredFileName());
        return new DownloadResult(resource, doc.getOriginalFileName(), doc.getMimeType(), doc.getFileSize());
    }

    @Transactional
    public void deleteDocument(Long userId, Long docId) {
        Document doc = documentRepository.findByIdAndUserId(docId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found or access denied."));

        fileStorageService.deleteFile(doc.getStoredFileName());
        documentRepository.delete(doc);
    }

    public static class DownloadResult {
        private final Resource resource;
        private final String originalFilename;
        private final String contentType;
        private final long fileSize;

        public DownloadResult(Resource resource, String originalFilename, String contentType, long fileSize) {
            this.resource = resource;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.fileSize = fileSize;
        }

        public Resource getResource() {
            return resource;
        }

        public String getOriginalFilename() {
            return originalFilename;
        }

        public String getContentType() {
            return contentType;
        }

        public long getFileSize() {
            return fileSize;
        }
    }
}
