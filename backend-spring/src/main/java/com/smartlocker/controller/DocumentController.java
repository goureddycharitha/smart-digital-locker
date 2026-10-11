package com.smartlocker.controller;

import com.smartlocker.dto.ApiResponse;
import com.smartlocker.dto.DocumentDto;
import com.smartlocker.dto.DocumentListResponse;
import com.smartlocker.dto.DocumentUpdateRequest;
import com.smartlocker.security.UserPrincipal;
import com.smartlocker.service.DocumentService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentDto>> uploadDocument(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "category", required = false, defaultValue = "Other") String category,
            @RequestParam(value = "description", required = false) String description) {

        DocumentDto doc = documentService.uploadDocument(userPrincipal.getId(), file, title, category, description);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Document uploaded successfully", doc));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentDto>> uploadDocumentAlias(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "category", required = false, defaultValue = "Other") String category,
            @RequestParam(value = "description", required = false) String description) {

        return uploadDocument(userPrincipal, file, title, category, description);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DocumentListResponse>> getDocuments(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {

        DocumentListResponse listResponse = documentService.getDocuments(userPrincipal.getId(), category, search, page, limit);
        return ResponseEntity.ok(ApiResponse.success("Documents retrieved successfully", listResponse));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentDto>> getDocumentById(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("id") Long id) {

        DocumentDto doc = documentService.getDocumentById(userPrincipal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Document retrieved successfully", doc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentDto>> updateDocument(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("id") Long id,
            @Valid @RequestBody DocumentUpdateRequest request) {

        DocumentDto updated = documentService.updateDocument(userPrincipal.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Document updated successfully", updated));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("id") Long id) {

        DocumentService.DownloadResult result = documentService.downloadDocument(userPrincipal.getId(), id);

        String encodedFilename = URLEncoder.encode(result.getOriginalFilename(), StandardCharsets.UTF_8)
                .replaceAll("\\+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(result.getContentType()))
                .contentLength(result.getFileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.getOriginalFilename() + "\"; filename*=UTF-8''" + encodedFilename)
                .body(result.getResource());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("id") Long id) {

        documentService.deleteDocument(userPrincipal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully"));
    }
}
