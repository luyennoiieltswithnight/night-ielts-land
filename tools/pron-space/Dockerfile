FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends espeak-ng ffmpeg && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH HF_HOME=/home/user/.cache PYTHONUNBUFFERED=1
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r requirements.txt
RUN python -c "from transformers import AutoProcessor, AutoModelForCTC; m='facebook/wav2vec2-lv-60-espeak-cv-ft'; AutoProcessor.from_pretrained(m); AutoModelForCTC.from_pretrained(m)"
COPY --chown=user . .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
