package com.woojudraw.global.config.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

	@Value("${cloud.aws.region.static}")
	private String region;

	@Value("${cloud.aws.credentials.accessKey:}")
	private String accessKey;

	@Value("${cloud.aws.credentials.secretKey:}")
	private String secretKey;

	@Bean
	public S3Presigner s3Presigner() {
		S3Presigner.Builder builder = S3Presigner.builder()
			.region(Region.of(region));

		if (accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank()) {
			builder.credentialsProvider(DefaultCredentialsProvider.create());
		} else {
			builder.credentialsProvider(
				StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey))
			);
		}

		return builder.build();
	}

	@Bean
	public S3Client s3Client() {
		return S3Client.builder()
				.region(Region.of(region))
				.credentialsProvider(
						(accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank())
								? DefaultCredentialsProvider.create()
								: StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
				.build();
	}
}
