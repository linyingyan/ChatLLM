# 位置：backend_template/test_local.py
import requests


# 图片中的测试代码（严格匹配）
def test_local_service():
    resp = requests.get("http://localhost:8001/2025-events")
    assert resp.status_code == 200, f"请求失败，状态码：{resp.status_code}"

    content = resp.json()["content"]
    print("测试通过！响应前100字符：", content[:100])  # 完全匹配图片要求

    # 扩展验证（图片未展示但建议）
    assert "GPT-5" in content, "响应未包含预期关键词"
    print("✅ 内容验证通过")


if __name__ == "__main__":
    test_local_service()