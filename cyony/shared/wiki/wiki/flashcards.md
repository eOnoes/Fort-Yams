# MiMo Model Flashcards

*Generated from the Cyony Model Configuration Plan.*

---

## Core Models

<!-- What makes mimo-v2.5 different from mimo-v2.5-pro? -->
mimo-v2.5::15B active params, 310B total, 1x credits, native multimodal (text/image/audio/video)
mimo-v2.5-pro::42B active params, 1T total, 2x credits, text-only, optimized for complex code
mimo-v2-omni::Legacy multimodal model with 256K context, supports PDF input

## Token Plan

<!-- What's the credit difference between Base and Pro on the MiMo Token Plan? -->
Credit multiplier::Base = 1x credits, Pro = 2x credits for the same raw tokens
<!-- Why does Pro cost 2x if it uses similar raw tokens? -->
Raw tokens are similar per call. The savings is purely the credit multiplier (1x vs 2x).

## Config Strategy

<!-- What's the recommended daily driver model and why? -->
mimo-v2.5 base::1x credits, has vision/tools/reasoning, handles everything daily
<!-- When should you switch to Pro? -->
On-demand via `/model mimo-v2.5-pro` for heavy code work only
<!-- Which auxiliary task should NOT use MiMo? -->
compression::Should use deepseek-v4-flash — summarizing old context doesn't need reasoning

## Token Optimization

<!-- What does jCodeMunch do? -->
Reduces code-reading tokens by 95% by retrieving only the specific function/section
<!-- What does Ponytail do? -->
Reduces written code by ~54% by applying YAGNI + stdlib-first + native-features-first
<!-- What's the estimated total savings from all optimizations? -->
~80-85% fewer credits burned for the same work

## Tooling

<!-- Which platform toolsets should be disabled and why? -->
Disabled::hermes-discord, -slack, -teams, -google_chat, -yuanbao, -qqbot, -homeassistant, -whatsapp, -signal — saves system prompt overhead from unused tool schemas

## MiMo TTS Models (keep these active)

<!-- Name the three TTS models available -->
mimo-v2.5-tts::Standard TTS, 8192 context, free/open weights
mimo-v2.5-tts-voiceclone::Voice cloning TTS
mimo-v2.5-tts-voicedesign::Voice design TTS
