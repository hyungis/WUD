package com.woojudraw.domain.storage.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.storage.entity.Image;

public interface ImageRepository extends JpaRepository<Image, Long> {

	boolean existsByImageKey(String imageKey);
}
