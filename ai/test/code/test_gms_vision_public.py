from __future__ import annotations

import os
from openai import OpenAI


def main() -> None:
    base_url = os.getenv("GMS_BASE_URL", "https://gms.ssafy.io/gmsapi/api.openai.com/v1").rstrip("/")
    api_key = os.getenv("GMS_KEY", "")
    model = os.getenv("GMS_MODEL", "gpt-4o")

    if not api_key:
        raise SystemExit("GMS_KEY가 필요합니다.")

    client = OpenAI(api_key=api_key, base_url=base_url)

    # Try a few different public URLs (some networks block specific domains).
    candidates = [
        # Wikimedia (sometimes blocked)
        "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/"
        "Gfp-wisconsin-madison-the-nature-boardwalk.jpg/640px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
        # Picsum (simple public image CDN)
        "https://picsum.photos/id/10/640/427",
        "https://picsum.photos/id/237/640/427",
        # Placehold (static)
        "https://placehold.co/640x427/png",
    ]

    last_err: Exception | None = None
    for image_url in candidates:
        print("Trying image_url:", image_url)
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "developer", "content": "Return a JSON object only."},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "What's in this image? Respond as JSON: {\"summary\": \"...\"}"},
                            {"type": "image_url", "image_url": {"url": image_url}},
                        ],
                    },
                ],
                max_tokens=200,
                response_format={"type": "json_object"},
            )
            choice = resp.choices[0]
            msg = choice.message
            print("finish_reason:", choice.finish_reason)
            print("refusal:", getattr(msg, "refusal", None))
            print("content:", msg.content)
            return
        except Exception as e:
            last_err = e
            print("failed:", e)

    raise SystemExit(f"All image URL candidates failed. last_error={last_err}")


if __name__ == "__main__":
    main()

