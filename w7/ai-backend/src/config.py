import os
from dotenv import load_dotenv

# Tự động nạp các biến từ file .env vào môi trường
load_dotenv()

class Config:
    AWS_REGION = os.environ.get("AWS_REGION")
    BEDROCK_KB_ID = os.environ.get("BEDROCK_KB_ID")
    BEDROCK_DS_ID = os.environ.get("BEDROCK_DS_ID")
    BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID")
    DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE")


if not Config.BEDROCK_KB_ID:
    raise ValueError("Lỗi cấu hình: BEDROCK_KB_ID chưa được thiết lập trong file .env hoặc biến môi trường.")
if not Config.BEDROCK_DS_ID:
    raise ValueError("Lỗi cấu hình: BEDROCK_DS_ID chưa được thiết lập trong file .env hoặc biến môi trường.")
if not Config.BEDROCK_MODEL_ID:
    raise ValueError("Lỗi cấu hình: BEDROCK_MODEL_ID chưa được thiết lập trong file .env hoặc biến môi trường.")
if not Config.DYNAMODB_TABLE:
    raise ValueError("Lỗi cấu hình: DYNAMODB_TABLE chưa được thiết lập trong file .env hoặc biến môi trường.")
if not Config.AWS_REGION:
    raise ValueError("Lỗi cấu hình: AWS_REGION chưa được thiết lập trong file .env hoặc biến môi trường.")
