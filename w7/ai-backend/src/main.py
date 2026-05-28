from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.rag_pipeline import RAGPipeline
from src.config import Config

app = FastAPI(title="AI Backend", version="1.0.0")

# Khởi tạo 1 lần duy nhất khi app start (tránh tạo boto3 client mỗi request)
pipeline = RAGPipeline(
    knowledge_base_id=Config.BEDROCK_KB_ID,
    model_id=Config.BEDROCK_MODEL_ID
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    workspace_id: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/chat")
def chat_with_docs(request: ChatRequest):
    try:
        response = pipeline.retrieve_and_generate(
            query=request.query, 
            workspace_id=request.workspace_id,
            top_k=5
        )
        return {
            "answer": response.answer,
            "sources": response.sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
