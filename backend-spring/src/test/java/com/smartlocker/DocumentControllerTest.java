package com.smartlocker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlocker.dto.AuthResponse;
import com.smartlocker.dto.RegisterRequest;
import com.smartlocker.repository.DocumentRepository;
import com.smartlocker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String userToken1;
    private String userToken2;

    @BeforeEach
    void setUp() throws Exception {
        documentRepository.deleteAll();
        userRepository.deleteAll();

        // Register User 1
        RegisterRequest user1 = new RegisterRequest("User One", "user1@example.com", "Password@123");
        MvcResult res1 = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(user1)))
                .andExpect(status().isCreated())
                .andReturn();
        AuthResponse auth1 = objectMapper.readValue(res1.getResponse().getContentAsString(), AuthResponse.class);
        userToken1 = auth1.getToken();

        // Register User 2
        RegisterRequest user2 = new RegisterRequest("User Two", "user2@example.com", "Password@123");
        MvcResult res2 = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(user2)))
                .andExpect(status().isCreated())
                .andReturn();
        AuthResponse auth2 = objectMapper.readValue(res2.getResponse().getContentAsString(), AuthResponse.class);
        userToken2 = auth2.getToken();
    }

    @Test
    void uploadDocument_validPdf_shouldReturn201() throws Exception {
        byte[] pdfBytes = "%PDF-1.4 Mock PDF Content".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "degree.pdf", "application/pdf", pdfBytes);

        mockMvc.perform(multipart("/api/documents")
                        .file(file)
                        .param("title", "Degree Certificate")
                        .param("category", "Academic")
                        .param("description", "My BTech degree")
                        .header("Authorization", "Bearer " + userToken1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Degree Certificate"))
                .andExpect(jsonPath("$.data.category").value("Academic"))
                .andExpect(jsonPath("$.data.originalFileName").value("degree.pdf"));
    }

    @Test
    void uploadDocument_invalidSignature_shouldReturn400() throws Exception {
        // Fake PDF with invalid signature
        byte[] fakeBytes = "NOT A REAL PDF FILE".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.pdf", "application/pdf", fakeBytes);

        mockMvc.perform(multipart("/api/documents")
                        .file(file)
                        .param("title", "Fake PDF")
                        .param("category", "Academic")
                        .header("Authorization", "Bearer " + userToken1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("File content does not match genuine PDF signature."));
    }

    @Test
    void crossUserAccess_user2CannotAccessUser1Document() throws Exception {
        // User 1 uploads document
        byte[] pdfBytes = "%PDF-1.4 User1 Private Document".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "confidential.pdf", "application/pdf", pdfBytes);

        MvcResult uploadResult = mockMvc.perform(multipart("/api/documents")
                        .file(file)
                        .param("title", "Confidential Document")
                        .param("category", "Financial")
                        .header("Authorization", "Bearer " + userToken1))
                .andExpect(status().isCreated())
                .andReturn();

        // Extract document ID from response
        String json = uploadResult.getResponse().getContentAsString();
        Number docId = com.jayway.jsonpath.JsonPath.read(json, "$.data.id");

        // User 2 attempts to get User 1's document
        mockMvc.perform(get("/api/documents/" + docId)
                        .header("Authorization", "Bearer " + userToken2))
                .andExpect(status().isNotFound());

        // User 2 attempts to download User 1's document
        mockMvc.perform(get("/api/documents/" + docId + "/download")
                        .header("Authorization", "Bearer " + userToken2))
                .andExpect(status().isNotFound());

        // User 2 attempts to delete User 1's document
        mockMvc.perform(delete("/api/documents/" + docId)
                        .header("Authorization", "Bearer " + userToken2))
                .andExpect(status().isNotFound());
    }

    @Test
    void listDocuments_unauthenticated_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/documents"))
                .andExpect(status().isUnauthorized());
    }
}
