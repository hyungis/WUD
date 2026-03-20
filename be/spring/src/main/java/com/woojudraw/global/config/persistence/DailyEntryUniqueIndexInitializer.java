package com.woojudraw.global.config.persistence;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DailyEntryUniqueIndexInitializer {

	private static final Logger log = LoggerFactory.getLogger(DailyEntryUniqueIndexInitializer.class);
	private static final String INDEX_NAME = "uk_daily_entries_active_user_entry_date";
	private static final String CREATE_INDEX_SQL = """
		create unique index if not exists %s
		on daily_entries (users_id, entry_date)
		where deleted_at is null
		""".formatted(INDEX_NAME);

	private final DataSource dataSource;
	private final JdbcTemplate jdbcTemplate;

	@EventListener(ApplicationReadyEvent.class)
	public void ensureUniqueIndex() {
		if (!isPostgreSql()) {
			return;
		}

		jdbcTemplate.execute(CREATE_INDEX_SQL);
		log.info("Ensured PostgreSQL unique index exists: {}", INDEX_NAME);
	}

	private boolean isPostgreSql() {
		try (Connection connection = dataSource.getConnection()) {
			return "PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName());
		} catch (SQLException e) {
			throw new IllegalStateException("Failed to inspect database metadata for daily index initialization", e);
		}
	}
}
