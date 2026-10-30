# api/deepseek.py
import os
import httpx
from typing import AsyncGenerator, List, Dict
from fastapi import HTTPException
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # 加载项目根目录下的 .env 文件

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_BASE = "https://api.deepseek.com/v1"


async def deepseek_stream_generator(
        messages: List[Dict],
        model: str,
        temperature: float
) -> AsyncGenerator[str, None]:
    """流式响应生成器（纯API调用逻辑）"""
    headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}"}
    payload = {"messages": messages, "model": model, "stream": True, "temperature": temperature}

    async with httpx.AsyncClient() as client:
        async with client.stream("POST", f"{DEEPSEEK_API_BASE}/chat/completions", headers=headers,
                                 json=payload) as response:
            if response.status_code != 200:
                error = await response.aread()
                raise HTTPException(response.status_code, error.decode())

            async for chunk in response.aiter_lines():
                if chunk.startswith("data: ") and chunk.strip() != "data: [DONE]":
                    yield chunk[6:].strip()


def send_messages(messages, tools=None):
    client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com",
    )
    if tools is not None:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            tools=tools
        )
        return response.choices[0].message
    else:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages
        )
        return response.choices[0].message



if __name__ == '__main__':
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get weather of an location, the user shoud supply a location first",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The city and state, e.g. San Francisco, CA",
                        }
                    },
                    "required": ["location"]
                },
            }
        },
    ]

    messages = [{"role": "user", "content": "How's the weather in Hangzhou?"}]
    message = send_messages(messages, tools)
    print(f"User：{messages[0]['content']}")

    tool = message.tool_calls[0]
    print(f"tool call：{tool}")
    messages.append(message)

    messages.append({"role": "tool", "tool_call_id": tool.id, "content": "24℃"})
    message = send_messages(messages, tools)
    messages.append(message)
    print(f"Model：{message.content}")
    

    print(f"messages：{messages}")

    # ------------------------ 第二遍 ----------------------------
    messages.append({"role": "user", "content": "How's the weather in Hangzhou?"})
    message = send_messages(messages, tools)
    print(f"User：{messages[0]['content']}")

    tool = message.tool_calls[0]
    print(f"tool call：{tool}")
    messages.append(message)

'''
输出：
    User：How's the weather in Hangzhou?
    tool call：ChatCompletionMessageToolCall(id='call_0_e963a61d-39d9-48bd-8d13-85fcfcd0a4e4', function=Function(arguments='{"location":"Hangzhou"}', name='get_weather'), type='function', index=0)
    Model：The current temperature in Hangzhou is 24°C. Let me know if you'd like more details about the weather there!
    messages：[{'role': 'user', 'content': "How's the weather in Hangzhou?"}, ChatCompletionMessage(content='', refusal=None, role='assistant', annotations=None, audio=None, function_call=None, tool_calls=[ChatCompletionMessageToolCall(id='call_0_e963a61d-39d9-48bd-8d13-85fcfcd0a4e4', function=Function(arguments='{"location":"Hangzhou"}', name='get_weather'), type='function', index=0)]), {'role': 'tool', 'tool_call_id': 'call_0_e963a61d-39d9-48bd-8d13-85fcfcd0a4e4', 'content': '24℃'}]
    
'''