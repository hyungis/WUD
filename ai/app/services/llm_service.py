import requests
from fastapi import HTTPException
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.api_key = settings.upstage_api_key
        self.base_url = "https://api.upstage.ai/v1/solar/chat/completions" # Upstage Solar endpoint

    def analyze_results(self, classifications: list) -> str:
        """
        YOLO 분류 결과를 바탕으로 Upstage Solar LLM에게 분석을 요청합니다.
        """
        if not self.api_key:
            raise HTTPException(status_code=500, detail="UPSTAGE_API_KEY is not configured")

        if not classifications:
            return "분석할 수 없는 이미지이거나 객체가 감지되지 않았습니다."

        # 프롬프트 구성
        objects_str = ", ".join([f"{item['class']} (신뢰도: {item['confidence']:.2f})" for item in classifications[:5]])
        
        system_prompt = "당신은 이미지 분석 전문가입니다. 제공된 사진 속 객체 정보(YOLO 분석결과)를 바탕으로 사용자의 일상과 상황을 친근한 말투로 자연스럽게 분석해서 3문장 이내로 정리해주세요."
        user_prompt = f"사진에서 다음과 같은 객체들이 발견되었습니다: {objects_str}. 이 사진을 찍은 상황이 어떤 것 같은지 분석해주세요."

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "solar-pro", # 사용할 모델 이름 확인 필요
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 512
        }

        try:
            print("Requesting Upstage Solar API for analysis...")
            response = requests.post(self.base_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            result_json = response.json()
            analysis_text = result_json["choices"][0]["message"]["content"]
            return analysis_text
            
        except requests.exceptions.RequestException as e:
            print(f"Error calling Upstage Solar API: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response content: {e.response.text}")
            raise HTTPException(status_code=500, detail=f"LLM analysis failed: {str(e)}")

llm_service = LLMService()
