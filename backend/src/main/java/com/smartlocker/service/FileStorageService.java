package com.smartlocker.service;

import com.smartlocker.exception.BadRequestException;
import com.smartlocker.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path rootLocation;
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    public FileStorageService(@Value("${smartlocker.storage.location:./uploads}") String storageLocation) {
        this.rootLocation = Paths.get(storageLocation).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    public String storeFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Uploaded file cannot be empty.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File exceeds maximum allowed size of 10MB.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            throw new BadRequestException("File must have a valid name.");
        }

        String extension = getFileExtension(originalFilename);
        validateFileExtensionAndSignature(file, extension);

        String storedFileName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().replace("-", "") + "." + extension;

        try {
            Path destinationFile = this.rootLocation.resolve(storedFileName).normalize();
            if (!destinationFile.startsWith(this.rootLocation)) {
                throw new BadRequestException("Invalid file destination path (Directory traversal detected).");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }

            return storedFileName;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + originalFilename, e);
        }
    }

    public Resource loadFileAsResource(String storedFileName) {
        try {
            Path filePath = this.rootLocation.resolve(storedFileName).normalize();
            if (!filePath.startsWith(this.rootLocation)) {
                throw new BadRequestException("Access denied: Invalid file path.");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File not found on storage: " + storedFileName);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("File not found on storage: " + storedFileName);
        }
    }

    public boolean deleteFile(String storedFileName) {
        if (storedFileName == null || storedFileName.trim().isEmpty()) {
            return false;
        }
        try {
            Path filePath = this.rootLocation.resolve(storedFileName).normalize();
            if (filePath.startsWith(this.rootLocation)) {
                return Files.deleteIfExists(filePath);
            }
        } catch (IOException ignored) {
        }
        return false;
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < filename.length() - 1) {
            return filename.substring(dotIndex + 1).toLowerCase();
        }
        return "bin";
    }

    private void validateFileExtensionAndSignature(MultipartFile file, String extension) {
        String ext = extension.toLowerCase();
        boolean validExt = Arrays.asList("pdf", "png", "jpg", "jpeg", "txt", "docx").contains(ext);
        if (!validExt) {
            throw new BadRequestException("Unsupported file format ." + ext + ". Allowed formats: PDF, PNG, JPG, JPEG, TXT, DOCX.");
        }

        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[8];
            int read = is.read(header);
            if (read < 2 && !ext.equals("txt")) {
                throw new BadRequestException("Corrupted file or missing header signature.");
            }

            switch (ext) {
                case "pdf":
                    // %PDF -> 0x25, 0x50, 0x44, 0x46
                    if (header[0] != 0x25 || header[1] != 0x50 || header[2] != 0x44 || header[3] != 0x46) {
                        throw new BadRequestException("File content does not match genuine PDF signature.");
                    }
                    break;
                case "png":
                    // PNG signature 89 50 4E 47
                    if ((header[0] & 0xFF) != 0x89 || header[1] != 0x50 || header[2] != 0x4E || header[3] != 0x47) {
                        throw new BadRequestException("File content does not match genuine PNG signature.");
                    }
                    break;
                case "jpg":
                case "jpeg":
                    // JPEG signature FF D8 FF
                    if ((header[0] & 0xFF) != 0xFF || (header[1] & 0xFF) != 0xD8 || (header[2] & 0xFF) != 0xFF) {
                        throw new BadRequestException("File content does not match genuine JPEG signature.");
                    }
                    break;
                case "docx":
                    // ZIP signature PK.. (0x50, 0x4B)
                    if (header[0] != 0x50 || header[1] != 0x4B) {
                        throw new BadRequestException("File content does not match genuine DOCX signature.");
                    }
                    break;
                case "txt":
                    // Plain text allows standard ASCII/UTF-8
                    break;
            }
        } catch (IOException e) {
            throw new BadRequestException("Unable to inspect file signature.");
        }
    }
}
