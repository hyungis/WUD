package com.woojudraw.domain.constellation.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class CenterStarShapeTypeConverter implements AttributeConverter<CenterStarShapeType, String> {

	@Override
	public String convertToDatabaseColumn(CenterStarShapeType attribute) {
		return attribute == null ? null : attribute.getValue();
	}

	@Override
	public CenterStarShapeType convertToEntityAttribute(String dbData) {
		return dbData == null ? null : CenterStarShapeType.fromValue(dbData);
	}
}
