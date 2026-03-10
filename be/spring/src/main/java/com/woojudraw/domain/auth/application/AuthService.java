package com.woojudraw.domain.auth.application;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.application.dto.IssuedTokens;

public interface AuthService {

	void signup(SignupReq req);

	IssuedTokens login(LoginReq req);

	IssuedTokens refresh(String refreshToken);

	void logout(String accessToken);
}
