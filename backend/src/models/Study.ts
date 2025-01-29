import mongoose, { Document } from 'mongoose';

// Define and export the interface
export interface IStudy extends Document {
  study_instance_uid: string;
  patient_id: mongoose.Types.ObjectId;
  study_date: Date;
  study_description?: string;
  series: {
    series_instance_uid: string;
    series_number?: number;
    series_description?: string;
    modality?: string;
  }[];
}

// Define the schema
const StudySchema = new mongoose.Schema<IStudy>({
  study_instance_uid: { type: String, required: true, unique: true },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  study_date: { type: Date, required: true },
  study_description: { type: String },
  series: [{
    series_instance_uid: { type: String, required: true },
    series_number: { type: Number },
    series_description: { type: String },
    modality: { type: String },
  }]
});

// Create and export the model
const Study = mongoose.model<IStudy>('Study', StudySchema);
export default Study; 