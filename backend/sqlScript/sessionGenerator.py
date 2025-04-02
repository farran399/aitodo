# 用雪花算法生成session_id
import time

class SessionIDGenerator:
    def __init__(self, machine_id=0):
        self.machine_id = machine_id  # 单机固定为0
        self.sequence = 0
        self.last_timestamp = 0

    def generate(self):
        timestamp = int(time.time() * 1000)  # 毫秒时间戳
        if timestamp == self.last_timestamp:
            self.sequence += 1
        else:
            self.sequence = 0
        self.last_timestamp = timestamp
        # 格式：时间戳41位 | 机器ID 10位 | 序列号12位
        return (timestamp << 22) | (self.machine_id << 12) | self.sequence

if __name__ == "__main__":
    generator = SessionIDGenerator()
    print(generator.generate())

