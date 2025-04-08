from volcenginesdkarkruntime import Ark

# 初始化火山方舟API客户端
client = Ark(
    api_key="b5dd48fa-f25c-4d1d-9645-a9f7ff5311f1",  # API密钥
    base_url="https://ark.cn-beijing.volces.com/api/v3")  # API基础URL


stream = client.chat.completions.create(
    model="ep-20250314182101-klj96",  # 使用的模型名称
    messages=[{"role": "user", "content": "测试"}],  # 完整的消息历史
    stream=True  # 启用流式响应
)

# 处理API返回的流式数据
for chunk in stream:
    if not chunk.choices:
        continue
    print(chunk.choices[0].delta.reasoning_content)
    print(chunk.choices[0].delta.content)