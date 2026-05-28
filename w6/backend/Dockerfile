FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000 8001

CMD ["sh", "-c", "cd /app && python monitoring_api.py & cd /app/src && python main.py"]
