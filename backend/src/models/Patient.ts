import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  diagnosis: { type: String, required: true },
  studyDate: { type: Date, required: true },
  images: [{
    type: { type: String, enum: ['MRI', 'CT', 'fMRI', 'DTI'] },
    date: { type: Date },
    dicomPath: { type: String },
    sequences: [{
      name: String,
      parameters: {
        TR: Number,
        TE: Number,
        sliceThickness: Number
      }
    }]
  }],
  icpReadings: [{
    timestamp: { type: Date },
    value: { type: Number },
    location: { type: String },
    waveform: [Number]
  }]
});

export default mongoose.model('Patient', PatientSchema); 