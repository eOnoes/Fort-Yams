# CosyVoice3 Fine-Tuning Guide (June 2026)

## Goal
Replicate MiMo TTS voice quality locally, uncensored. Fix L/R confusion by training on Scout's voice.

## Architecture
```
Text → [LLM (Qwen2)] → Speech Tokens → [Flow (DiT)] → Mel Spectrogram → [HiFi-GAN] → Audio
```

| Component | Fine-tune for | VRAM (fp16) |
|-----------|--------------|-------------|
| LLM | Voice identity, prosody | 6-8GB |
| Flow | Voice quality, naturalness | 4-6GB |
| HiFi-GAN | Audio quality (can freeze) | - |

## Path A: Zero-Shot Cloning (10 min, no training)
Already done. Reference audio at `D:\Trippcore\voices\cosyvoice\`. Problem: L/R confusion persists.

## Path B: Full Fine-Tune (hours, best quality)

### Data Prep
- Generate 100-500 sentences from MiMo TTS → WAV (24kHz, mono) + transcript
- Format: Kaldi-style (`wav.scp`, `text`, `utt2spk`, `spk2utt`, `instruct`)
- Extract embeddings via `campplus.onnx` + speech tokens via `speech_tokenizer_v3.onnx`
- Create Parquet format

### Training (RTX 4070 12GB)
```bash
torchrun --nnodes=1 --nproc_per_node=1 \
    --rdzv_id=1986 --rdzv_backend="c10d" --rdzv_endpoint="localhost:1234" \
    cosyvoice/bin/train.py \
    --train_engine torch_ddp \
    --config examples/libritts/cosyvoice3/conf/cosyvoice3.yaml \
    --train_data DATA/parquet/data.list \
    --cv_data DATA/parquet/data.list \
    --model llm \
    --checkpoint MODEL/llm.pt \
    --model_dir OUTPUT_DIR \
    --use_amp
```

### RTX 4070 Settings
- Batch size: 1 (limited VRAM)
- Gradient accumulation: 2
- Always use `--use_amp`
- `--num_workers 0`, `--prefetch 100`
- Train LLM first, then Flow separately
- Close other GPU apps during training

### OOM Fixes
- Reduce batch to 1
- Lower max_length from 6000 to 3000
- Train LLM only (skip Flow/HiFi-GAN)

## Update Worker
```bash
TRIPP_TTS_COSYVOICE_MODEL_DIR=D:\Trippcore\models\cosyvoice\fine-tuned\mimo
```

## Key Commands
| Task | Command |
|------|---------|
| Extract embeddings | `python tools/extract_embedding.py --dir DATA --onnx_path MODEL/campplus.onnx` |
| Extract tokens | `python tools/extract_speech_token.py --dir DATA --onnx_path MODEL/speech_tokenizer_v3.onnx` |
| Make parquet | `python tools/make_parquet_list.py --src_dir DATA --des_dir DATA/parquet` |
| Train LLM | `torchrun ... --model llm --checkpoint MODEL/llm.pt` |
| Train Flow | `torchrun ... --model flow --checkpoint MODEL/flow.pt` |
