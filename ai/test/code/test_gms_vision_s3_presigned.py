from __future__ import annotations

import os
from openai import OpenAI
import boto3


def presign(bucket: str, key: str, region: str) -> str:
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", ""),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", ""),
        region_name=region,
    )
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=600,
    )


def main() -> None:
    base_url = os.getenv("GMS_BASE_URL", "https://gms.ssafy.io/gmsapi/api.openai.com/v1").rstrip("/")
    api_key = os.getenv("GMS_KEY", "")
    model = os.getenv("GMS_MODEL", "gpt-4o")

    bucket = os.getenv("S3_BUCKET_NAME", "")
    region = os.getenv("AWS_REGION_NAME", "ap-northeast-2")

    if not api_key:
        raise SystemExit("GMS_KEY가 필요합니다.")
    if not bucket:
        raise SystemExit("S3_BUCKET_NAME이 필요합니다.")

    key = os.getenv("TEST_S3_KEY", "photos/test/집.jpg")
    url = presign(bucket, key, region)
    print("presigned_url:", url[:120] + "...")

    client = OpenAI(api_key=api_key, base_url=base_url)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "developer", "content": "Return JSON only."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image briefly. JSON: {\"summary\":\"...\"}"},
                    {"type": "image_url", "image_url": {"url": url}},
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


if __name__ == "__main__":
    main()

