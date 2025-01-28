from ctransformers import AutoModelForCausalLM

class JournalGenerator:
    def __init__(self):
        self.llm = AutoModelForCausalLM.from_pretrained(
            "models/mistral-7b-v0.1.Q4_K_M.gguf",
            model_type="mistral",
            gpu_layers=10
        )

    def generate_journal(self, patient_data, studies_data):
        prompt = f"""As a medical professional, write a brief journal entry summarizing the following patient information:
Patient Name: {patient_data['patient_name']}
Patient ID: {patient_data['patient_id']}
Studies: {', '.join([f"{s['study_description']} on {s['study_date']}" for s in studies_data])}
Always end with a shakespearian quote from Hamlet that is relevant to the medical field."""

        return self._stream_response(prompt)

    def _stream_response(self, prompt):
        for token in self.llm(prompt, stream=True):
            yield token 