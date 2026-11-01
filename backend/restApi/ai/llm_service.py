import os
from typing import Dict, List

import ollama

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# Prepended to every conversation. The chat history stored in the database never includes it.
SYS_PROMPT: List[Dict[str, str]] = [
    {"role": "system", "content": "You are a helpful assistant. Reply in the language the user writes in."},
]


def call_llm(messages: List[Dict[str, str]]) -> str:
    """Send a chat history to Ollama and return the assistant's reply.

    Args:
        messages: [{"role": "user" | "assistant", "content": str}, ...] in chronological order.
    """
    client = ollama.Client(host=OLLAMA_HOST)
    response = client.chat(model=MODEL, messages=SYS_PROMPT + messages)
    return response["message"]["content"]
