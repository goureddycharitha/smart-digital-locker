package com.smartlocker.dto;

import java.util.List;
import java.util.Map;

public class DocumentListResponse {

    private List<DocumentDto> documents;
    private PaginationDto pagination;
    private SummaryDto summary;

    public DocumentListResponse() {
    }

    public DocumentListResponse(List<DocumentDto> documents, PaginationDto pagination, SummaryDto summary) {
        this.documents = documents;
        this.pagination = pagination;
        this.summary = summary;
    }

    public List<DocumentDto> getDocuments() {
        return documents;
    }

    public void setDocuments(List<DocumentDto> documents) {
        this.documents = documents;
    }

    public PaginationDto getPagination() {
        return pagination;
    }

    public void setPagination(PaginationDto pagination) {
        this.pagination = pagination;
    }

    public SummaryDto getSummary() {
        return summary;
    }

    public void setSummary(SummaryDto summary) {
        this.summary = summary;
    }

    public static class PaginationDto {
        private int page;
        private int limit;
        private long total;
        private int totalPages;

        public PaginationDto() {
        }

        public PaginationDto(int page, int limit, long total, int totalPages) {
            this.page = page;
            this.limit = limit;
            this.total = total;
            this.totalPages = totalPages;
        }

        public int getPage() {
            return page;
        }

        public void setPage(int page) {
            this.page = page;
        }

        public int getLimit() {
            return limit;
        }

        public void setLimit(int limit) {
            this.limit = limit;
        }

        public long getTotal() {
            return total;
        }

        public void setTotal(long total) {
            this.total = total;
        }

        public int getTotalPages() {
            return totalPages;
        }

        public void setTotalPages(int totalPages) {
            this.totalPages = totalPages;
        }
    }

    public static class SummaryDto {
        private long totalBytes;
        private Map<String, Long> categoriesCount;

        public SummaryDto() {
        }

        public SummaryDto(long totalBytes, Map<String, Long> categoriesCount) {
            this.totalBytes = totalBytes;
            this.categoriesCount = categoriesCount;
        }

        public long getTotalBytes() {
            return totalBytes;
        }

        public void setTotalBytes(long totalBytes) {
            this.totalBytes = totalBytes;
        }

        public Map<String, Long> getCategoriesCount() {
            return categoriesCount;
        }

        public void setCategoriesCount(Map<String, Long> categoriesCount) {
            this.categoriesCount = categoriesCount;
        }
    }
}
