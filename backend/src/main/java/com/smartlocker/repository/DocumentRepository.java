package com.smartlocker.repository;

import com.smartlocker.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    Optional<Document> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    @Query("SELECT d FROM Document d WHERE d.user.id = :userId " +
           "AND (:category IS NULL OR :category = '' OR LOWER(d.category) = LOWER(:category)) " +
           "AND (:search IS NULL OR :search = '' OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(d.originalFileName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Document> searchDocuments(@Param("userId") Long userId,
                                   @Param("category") String category,
                                   @Param("search") String search,
                                   Pageable pageable);

    long countByUserId(Long userId);

    @Query("SELECT COALESCE(SUM(d.fileSize), 0L) FROM Document d WHERE d.user.id = :userId")
    Long sumFileSizeByUserId(@Param("userId") Long userId);

    @Query("SELECT d.category, COUNT(d) FROM Document d WHERE d.user.id = :userId GROUP BY d.category")
    List<Object[]> countByCategoryForUser(@Param("userId") Long userId);
}
