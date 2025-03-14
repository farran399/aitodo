import os
from volcenginesdkarkruntime import Ark
client = Ark(
    api_key="b5dd48fa-f25c-4d1d-9645-a9f7ff5311f1",
    base_url="https://ark.cn-beijing.volces.com/api/v3")

# 流式输出开始
print("----- stream request -----")
stream = client.chat.completions.create(
    model="deepseek-r1-250120",
    messages=[
        {"role": "system", "content": "你是豆包，是由字节跳动开发的 AI 人工智能助手"},
        {"role": "user", "content": "举出一种常见的十字花科植物，在十个字以内回答"},
    ],
    stream=True
)
# 分块输出回答
for chunk in stream:
    if not chunk.choices:
        continue
    print(chunk.choices[0].delta.reasoning_content, end="")
    print(chunk.choices[0].delta.content, end="")
print()