package com.woojudraw.domain.auth.application;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.api.dto.resp.LoginResp;

public interface AuthService {

	void signup(SignupReq req);

	LoginResp login(LoginReq req);

	void logout(String accessToken);
}
