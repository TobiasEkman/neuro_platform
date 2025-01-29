import mongoose from 'mongoose';

// Define sub-schemas for better organization
const MRISequenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parameters: {
    TR: { type: Number, required: true },
    TE: { type: Number, required: true },
    sliceThickness: { type: Number, required: true }
  }
});

const ImageStudySchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['MRI', 'CT', 'fMRI', 'DTI'] 
  },
  date: { type: Date, required: true },
  dicomPath: { type: String, required: true },
  sequences: [MRISequenceSchema]
});

const ICPReadingSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  value: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100 
  },
  location: { 
    type: String, 
    required: true,
    enum: ['Right frontal', 'Left frontal', 'Right temporal', 'Left temporal', 'Ventricles'] 
  },
  waveform: { 
    type: [Number],
    validate: {
      validator: function(v: number[]) {
        return v.length === 10; // Ensure waveform has exactly 10 values
      },
      message: 'Waveform must have exactly 10 values'
    }
  }
});

const PatientSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true,
    unique: true 
  },
  name: { 
    type: String, 
    required: true,
    minlength: 2,
    maxlength: 100 
  },
  age: { 
    type: Number, 
    required: true,
    min: 0,
    max: 120 
  },
  diagnosis: { 
    type: String, 
    required: true,
    minlength: 5,
    maxlength: 500 
  },
  studyDate: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(v: Date) {
        return v <= new Date(); // Ensure study date is not in the future
      },
      message: 'Study date cannot be in the future'
    }
  },
  images: {
    type: [ImageStudySchema],
    validate: {
      validator: function(v: typeof ImageStudySchema[]) {
        return v.length > 0; // Ensure at least one image
      },
      message: 'At least one image is required'
    }
  },
  icpReadings: [ICPReadingSchema]
}, {
  timestamps: true // Add createdAt and updatedAt fields
});

// Add indexes for frequently queried fields
PatientSchema.index({ name: 1 });
PatientSchema.index({ studyDate: -1 });
PatientSchema.index({ 'images.type': 1 });

export default mongoose.model('Patient', PatientSchema); 