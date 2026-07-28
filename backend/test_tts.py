import torch
import soundfile as sf
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

MODEL_NAME = "ai4bharat/indic-parler-tts"

device = "cuda:0" if torch.cuda.is_available() else "cpu"

print("Device:", device)
print("Loading Indic Parler-TTS...")

model = ParlerTTSForConditionalGeneration.from_pretrained(
    MODEL_NAME
).to(device)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

description_tokenizer = AutoTokenizer.from_pretrained(
    model.config.text_encoder._name_or_path
)

print("Model loaded.")

prompt = "ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಕಾಫಿ ಸೇವನೆಯನ್ನು ಮಿತಿಗೊಳಿಸುವುದು ಉತ್ತಮ   ?"

description = (
    "Anu speaks in a clear, calm and natural voice with moderate speed "
    "and pitch. The recording is very clear with no background noise."
)

description_inputs = description_tokenizer(
    description,
    return_tensors="pt"
).to(device)

prompt_inputs = tokenizer(
    prompt,
    return_tensors="pt"
).to(device)

print("Generating Kannada speech...")

generation = model.generate(
    input_ids=description_inputs.input_ids,
    attention_mask=description_inputs.attention_mask,
    prompt_input_ids=prompt_inputs.input_ids,
    prompt_attention_mask=prompt_inputs.attention_mask,
)

audio = generation.cpu().numpy().squeeze()

sf.write(
    "test_tts_output.wav",
    audio,
    model.config.sampling_rate
)

print("Done: test_tts_output.wav")