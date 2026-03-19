package com.woojudraw.manual;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class BulkStarAccountSeedManualTest {

	private static final ZoneOffset KST = ZoneOffset.ofHours(9);
	private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
	private static final LocalDate SEED_START_DATE = LocalDate.of(2026, 2, 28);

	private static final List<AccountSeedSpec> ACCOUNT_SPECS = List.of(
		new AccountSeedSpec(
			"seed-stars-1200@woojudraw.local",
			"seedStars1200",
			"Wooju1234!",
			1000,
			200
		),
		new AccountSeedSpec(
			"seed-stars-120@woojudraw.local",
			"seedStars120",
			"Wooju1234!",
			100,
			20
		)
	);

	@Test
	void seedManualAccounts() throws Exception {
		assumeTrue(isManualSeedEnabled(), "Manual DB seeding tool");

		DbConfig dbConfig = DbConfig.fromEnvironment();
		Class.forName("org.postgresql.Driver");

		try (Connection connection = DriverManager.getConnection(
			dbConfig.url(),
			dbConfig.username(),
			dbConfig.password()
		)) {
			connection.setAutoCommit(false);

			try {
				for (AccountSeedSpec spec : ACCOUNT_SPECS) {
					reseedAccount(connection, spec);
				}
				connection.commit();
			} catch (Exception exception) {
				connection.rollback();
				throw exception;
			}

			for (AccountSeedSpec spec : ACCOUNT_SPECS) {
				verifyCounts(connection, spec);
			}
		}
	}

	private void reseedAccount(Connection connection, AccountSeedSpec spec) throws SQLException {
		Long existingUserId = findUserIdByEmail(connection, spec.email());
		if (existingUserId != null) {
			deleteUserData(connection, existingUserId);
		}

		long userId = insertUser(connection, spec);
		seedDailies(connection, userId, spec);
		seedDeeps(connection, userId, spec);

		System.out.printf(
			"Seeded %s -> daily=%d, deep=%d, total=%d%n",
			spec.email(),
			spec.dailyCount(),
			spec.deepCount(),
			spec.totalStarCount()
		);
	}

	private Long findUserIdByEmail(Connection connection, String email) throws SQLException {
		String sql = "select id from users where email = ?";
		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, email);
			try (ResultSet resultSet = statement.executeQuery()) {
				if (!resultSet.next()) {
					return null;
				}
				return resultSet.getLong("id");
			}
		}
	}

	private void deleteUserData(Connection connection, long userId) throws SQLException {
		executeDelete(connection, "delete from stars where user_id = ?", userId);
		executeDelete(connection, "delete from deep_psych_assessments where user_id = ?", userId);
		executeDelete(
			connection,
			"delete from deep_submissions where deep_session_id in (select id from deep_sessions where user_id = ?)",
			userId
		);
		executeDelete(
			connection,
			"delete from deep_results where deep_session_id in (select id from deep_sessions where user_id = ?)",
			userId
		);
		executeDelete(
			connection,
			"delete from daily_results where daily_entries_id in (select id from daily_entries where users_id = ?)",
			userId
		);
		executeDelete(connection, "delete from deep_sessions where user_id = ?", userId);
		executeDelete(connection, "delete from daily_entries where users_id = ?", userId);
		executeDelete(connection, "delete from constellations where user_id = ?", userId);
		executeDelete(connection, "delete from users where id = ?", userId);
	}

	private void executeDelete(Connection connection, String sql, long userId) throws SQLException {
		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, userId);
			statement.executeUpdate();
		}
	}

	private long insertUser(Connection connection, AccountSeedSpec spec) throws SQLException {
		String sql = """
			insert into users (email, password, nickname, status, last_login_at, created_at, deleted_at)
			values (?, ?, ?, ?, ?, ?, ?)
			returning id
			""";

		OffsetDateTime createdAt = atKst(SEED_START_DATE, 23, 0);

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, spec.email());
			statement.setString(2, PASSWORD_ENCODER.encode(spec.password()));
			statement.setString(3, spec.nickname());
			statement.setString(4, "ACTIVATE");
			statement.setTimestamp(5, null);
			statement.setObject(6, createdAt);
			statement.setTimestamp(7, null);
			try (ResultSet resultSet = statement.executeQuery()) {
				if (!resultSet.next()) {
					throw new SQLException("Failed to insert user: " + spec.email());
				}
				return resultSet.getLong(1);
			}
		}
	}

	private void seedDailies(Connection connection, long userId, AccountSeedSpec spec) throws SQLException {
		for (int index = 0; index < spec.dailyCount(); index++) {
			LocalDate entryDate = SEED_START_DATE.minusDays(index);
			LocalDate weekStartDate = isoWeekStart(entryDate);
			long constellationId = findOrCreateConstellation(connection, userId, weekStartDate);
			long dailyId = insertDaily(connection, userId, index, entryDate);
			insertDailyResult(connection, dailyId, entryDate, index);
			insertDailyStar(connection, userId, constellationId, dailyId, colorOf(index), entryDate, index);
		}
	}

	private void seedDeeps(Connection connection, long userId, AccountSeedSpec spec) throws SQLException {
		LocalDate seedWeekStart = isoWeekStart(SEED_START_DATE);

		for (int index = 0; index < spec.deepCount(); index++) {
			LocalDate weekStartDate = seedWeekStart.minusWeeks(index);
			long constellationId = findOrCreateConstellation(connection, userId, weekStartDate);
			long deepSessionId = insertDeepSession(connection, userId, index, weekStartDate);
			insertDeepResult(connection, deepSessionId, weekStartDate, index);
			insertDeepStar(connection, userId, constellationId, deepSessionId, weekStartDate, index);
		}
	}

	private long findOrCreateConstellation(Connection connection, long userId, LocalDate weekStartDate) throws SQLException {
		String selectSql = "select id from constellations where user_id = ? and week_start_date = ?";
		try (PreparedStatement selectStatement = connection.prepareStatement(selectSql)) {
			selectStatement.setLong(1, userId);
			selectStatement.setDate(2, Date.valueOf(weekStartDate));
			try (ResultSet resultSet = selectStatement.executeQuery()) {
				if (resultSet.next()) {
					return resultSet.getLong("id");
				}
			}
		}

		String insertSql = """
			insert into constellations (user_id, week_start_date, week_end_date)
			values (?, ?, ?)
			returning id
			""";
		try (PreparedStatement insertStatement = connection.prepareStatement(insertSql)) {
			insertStatement.setLong(1, userId);
			insertStatement.setDate(2, Date.valueOf(weekStartDate));
			insertStatement.setDate(3, Date.valueOf(weekStartDate.plusDays(6)));
			try (ResultSet resultSet = insertStatement.executeQuery()) {
				if (!resultSet.next()) {
					throw new SQLException("Failed to create constellation for weekStartDate=" + weekStartDate);
				}
				return resultSet.getLong(1);
			}
		}
	}

	private long insertDaily(Connection connection, long userId, int index, LocalDate entryDate) throws SQLException {
		String sql = """
			insert into daily_entries (
				users_id,
				daily_type,
				entry_date,
				content,
				emotion_value,
				emotion_color,
				drawing_image_id,
				analysis_status,
				created_at,
				updated_at,
				deleted_at
			)
			values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			returning id
			""";

		OffsetDateTime createdAt = atKst(entryDate, 20, 0);
		OffsetDateTime updatedAt = createdAt.plusMinutes(30);

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, userId);
			statement.setString(2, dailyTypeOf(index));
			statement.setDate(3, Date.valueOf(entryDate));
			statement.setString(4, "Seed daily entry for " + entryDate);
			statement.setInt(5, 30 + (index % 61));
			statement.setString(6, colorOf(index));
			statement.setLong(7, userId * 1_000_000L + index + 1L);
			statement.setString(8, "DONE");
			statement.setObject(9, createdAt);
			statement.setObject(10, updatedAt);
			statement.setTimestamp(11, null);
			try (ResultSet resultSet = statement.executeQuery()) {
				if (!resultSet.next()) {
					throw new SQLException("Failed to insert daily entry for userId=" + userId);
				}
				return resultSet.getLong(1);
			}
		}
	}

	private void insertDailyResult(Connection connection, long dailyId, LocalDate entryDate, int index) throws SQLException {
		String sql = """
			insert into daily_results (daily_entries_id, result, raw, created_at)
			values (?, ?, ?, ?)
			""";

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, dailyId);
			statement.setString(2, "Seed daily result for " + entryDate);
			statement.setString(3, "{\"seed\":true,\"type\":\"daily\",\"index\":" + index + "}");
			statement.setObject(4, atKst(entryDate, 20, 45));
			statement.executeUpdate();
		}
	}

	private void insertDailyStar(
		Connection connection,
		long userId,
		long constellationId,
		long dailyId,
		String color,
		LocalDate entryDate,
		int index
	) throws SQLException {
		String sql = """
			insert into stars (
				user_id,
				constellation_id,
				daily_entry_id,
				deep_session_id,
				kind,
				color,
				created_at,
				updated_at
			)
			values (?, ?, ?, ?, ?, ?, ?, ?)
			""";

		OffsetDateTime createdAt = atKst(entryDate, 21, index % 60);

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, userId);
			statement.setLong(2, constellationId);
			statement.setLong(3, dailyId);
			statement.setObject(4, null);
			statement.setString(5, "DAILY");
			statement.setString(6, color);
			statement.setObject(7, createdAt);
			statement.setObject(8, createdAt.plusMinutes(1));
			statement.executeUpdate();
		}
	}

	private long insertDeepSession(Connection connection, long userId, int index, LocalDate weekStartDate) throws SQLException {
		String sql = """
			insert into deep_sessions (
				user_id,
				deep_type,
				submitted_at,
				completed_at,
				status,
				created_at,
				updated_at
			)
			values (?, ?, ?, ?, ?, ?, ?)
			returning id
			""";

		OffsetDateTime createdAt = atKst(weekStartDate.plusDays(4), 19, 0);
		OffsetDateTime submittedAt = createdAt.plusMinutes(20);
		OffsetDateTime completedAt = createdAt.plusMinutes(50);

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, userId);
			statement.setString(2, deepTypeOf(index));
			statement.setObject(3, submittedAt);
			statement.setObject(4, completedAt);
			statement.setString(5, "DONE");
			statement.setObject(6, createdAt);
			statement.setObject(7, completedAt);
			try (ResultSet resultSet = statement.executeQuery()) {
				if (!resultSet.next()) {
					throw new SQLException("Failed to insert deep session for userId=" + userId);
				}
				return resultSet.getLong(1);
			}
		}
	}

	private void insertDeepResult(Connection connection, long deepSessionId, LocalDate weekStartDate, int index)
		throws SQLException {
		String sql = """
			insert into deep_results (deep_session_id, result, raw, created_at)
			values (?, ?, ?, ?)
			""";

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, deepSessionId);
			statement.setString(2, "Seed deep result for week " + weekStartDate);
			statement.setString(3, "{\"seed\":true,\"type\":\"deep\",\"index\":" + index + "}");
			statement.setObject(4, atKst(weekStartDate.plusDays(4), 20, 0));
			statement.executeUpdate();
		}
	}

	private void insertDeepStar(
		Connection connection,
		long userId,
		long constellationId,
		long deepSessionId,
		LocalDate weekStartDate,
		int index
	) throws SQLException {
		String sql = """
			insert into stars (
				user_id,
				constellation_id,
				daily_entry_id,
				deep_session_id,
				kind,
				color,
				created_at,
				updated_at
			)
			values (?, ?, ?, ?, ?, ?, ?, ?)
			""";

		OffsetDateTime createdAt = atKst(weekStartDate.plusDays(4), 20, 10 + (index % 30));

		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, userId);
			statement.setLong(2, constellationId);
			statement.setObject(3, null);
			statement.setLong(4, deepSessionId);
			statement.setString(5, "DEEP");
			statement.setObject(6, null);
			statement.setObject(7, createdAt);
			statement.setObject(8, createdAt.plusMinutes(1));
			statement.executeUpdate();
		}
	}

	private void verifyCounts(Connection connection, AccountSeedSpec spec) throws SQLException {
		Long userId = findUserIdByEmail(connection, spec.email());
		if (userId == null) {
			throw new SQLException("User not found after seeding: " + spec.email());
		}

		assertEquals(spec.dailyCount(), countBySql(connection, "select count(*) from daily_entries where users_id = ?", userId));
		assertEquals(spec.deepCount(), countBySql(connection, "select count(*) from deep_sessions where user_id = ?", userId));
		assertEquals(spec.dailyCount(), countBySql(connection, "select count(*) from stars where user_id = ? and kind = 'DAILY'", userId));
		assertEquals(spec.deepCount(), countBySql(connection, "select count(*) from stars where user_id = ? and kind = 'DEEP'", userId));
		assertEquals(spec.totalStarCount(), countBySql(connection, "select count(*) from stars where user_id = ?", userId));

		System.out.printf(
			"Verified %s -> total stars=%d%n",
			spec.email(),
			spec.totalStarCount()
		);
	}

	private int countBySql(Connection connection, String sql, long userId) throws SQLException {
		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setLong(1, userId);
			try (ResultSet resultSet = statement.executeQuery()) {
				resultSet.next();
				return resultSet.getInt(1);
			}
		}
	}

	private String dailyTypeOf(int index) {
		return switch (index % 3) {
			case 0 -> "MANDALA";
			case 1 -> "COLORING";
			default -> "FREE";
		};
	}

	private String deepTypeOf(int index) {
		return switch (index % 3) {
			case 0 -> "HTP";
			case 1 -> "PERSON_IN_RAIN";
			default -> "STAR_WAVE";
		};
	}

	private String colorOf(int index) {
		return switch (index % 6) {
			case 0 -> "#FFB74D";
			case 1 -> "#4FC3F7";
			case 2 -> "#81C784";
			case 3 -> "#F06292";
			case 4 -> "#9575CD";
			default -> "#AED581";
		};
	}

	private LocalDate isoWeekStart(LocalDate date) {
		return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
	}

	private OffsetDateTime atKst(LocalDate date, int hour, int minute) {
		return OffsetDateTime.of(date, LocalTime.of(hour, minute), KST);
	}

	private boolean isManualSeedEnabled() {
		return Boolean.parseBoolean(System.getProperty("manualSeed"))
			|| Boolean.parseBoolean(System.getenv("MANUAL_SEED"));
	}

	private record DbConfig(String url, String username, String password) {
		private static DbConfig fromEnvironment() {
			String url = System.getenv("DB_URL");
			String username = System.getenv("DB_USERNAME");
			String password = System.getenv("DB_PASSWORD");

			if (isBlank(url) || isBlank(username) || isBlank(password)) {
				throw new IllegalStateException("DB_URL, DB_USERNAME, DB_PASSWORD must be set");
			}

			return new DbConfig(url, username, password);
		}

		private static boolean isBlank(String value) {
			return value == null || value.isBlank();
		}
	}

	private record AccountSeedSpec(
		String email,
		String nickname,
		String password,
		int dailyCount,
		int deepCount
	) {
		private int totalStarCount() {
			return dailyCount + deepCount;
		}
	}
}
