# 处理火山方舟API
import os
import description
from volcenginesdkarkruntime import Ark

client = Ark(
    api_key="b5dd48fa-f25c-4d1d-9645-a9f7ff5311f1",
    base_url="https://ark.cn-beijing.volces.com/api/v3")

# 流式响应
def generate(input):
    try:
        # 使用模型doubao-1-5-pro-256k-250115\deepseek-v3-241226\ep-20250314182101-klj96动态生成
        stream = client.chat.completions.create(
            model="ep-20250314182101-klj96",
            messages=[
                {"role": "system", "content": description.v1},
                {"role": "user", "content": input},
            ],
            stream=True
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            # 检查并只返回非None的reasoning_content
            
            if (chunk.choices[0].delta.content is not None) and (chunk.choices[0].delta.content != ''):
                chunkContent = (chunk.choices[0].delta.content).replace('\\','\\\\')
                chunkContent = chunkContent.replace('\n', '\\n')
                chunkContent = chunkContent.replace('\t', '\\t')
                chunkContent = chunkContent.replace('"', '\\"')
                yield '''{"content":"%s","type":1}\n'''% chunkContent
            else:
                if (chunk.choices[0].delta.reasoning_content is not None) and (chunk.choices[0].delta.reasoning_content != ''):
                    chunkContent = (chunk.choices[0].delta.reasoning_content).replace('\\','\\\\')
                    chunkContent = chunkContent.replace('\n', '\\n')
                    chunkContent = chunkContent.replace('\t', '\\t')
                    chunkContent = chunkContent.replace('"', '\\"')
                    yield '''{"content":"%s","type":0}\n'''% chunkContent
    
    except Exception as e:
        return {'error': f'处理请求时发生错误: {str(e)}'}, 500
                