from transformers import AutoModel
import torch
import torchaudio
import soundfile as sf

MODEL_NAME = "ai4bharat/indic-conformer-600m-multilingual"

print("Loading IndicConformer...")

model = AutoModel.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True
)

print("Model loaded.")

# Load WAV without torchaudio.load / TorchCodec
audio, sr = sf.read("test_audio.wav")

wav = torch.tensor(audio, dtype=torch.float32)

# Stereo -> mono
if wav.ndim > 1:
    wav = torch.mean(wav, dim=1)

wav = wav.unsqueeze(0)

# Resample to 16 kHz
if sr != 16000:
    resampler = torchaudio.transforms.Resample(
        orig_freq=sr,
        new_freq=16000
    )
    wav = resampler(wav)

print("Running Kannada STT...")

result = model(wav, "kn", "ctc")

print("\nTranscription:")
print(result)