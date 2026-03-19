package com.woojudraw.domain.image.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.image.entity.Image;

public interface ImageRepository extends JpaRepository<Image, Long> {

	Optional<Image> findByImageKeyAndDeletedAtIsNull(String imageKey);
}
