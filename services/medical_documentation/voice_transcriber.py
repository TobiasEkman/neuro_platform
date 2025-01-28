import whisper
import tempfile
import soundfile as sf

class VoiceTranscriber:
    def __init__(self):
        self.model = whisper.load_model("tiny")

    def transcribe(self, audio_data, sample_rate=16000):
        # Save audio data to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav') as temp_file:
            sf.write(temp_file.name, audio_data, sample_rate)
            # Transcribe using Whisper
            result = self.model.transcribe(temp_file.name)
            return result["text"] 