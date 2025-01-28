import mongoose from 'mongoose';

const StudySchema = new mongoose.Schema({
  study_instance_uid: { type: String, required: true, unique: true },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  study_date: { type: Date, required: true },
  study_description: { type: String },
  series: [{
    series_instance_uid: { type: String, required: true },
    series_number: { type: Number },
    series_description: { type: String },
    modality: { type: String },
    // Add other relevant fields as necessary
  }]
});

export default mongoose.model('Study', StudySchema); 