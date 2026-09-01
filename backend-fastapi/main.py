import os

import psycopg2
from fastapi import FastAPI

app = FastAPI()

DATABASE_URL = os.environ.get("DATABASE_URL")


@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}


@app.get("/health")
def health():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.close()
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "detail": str(e)}
