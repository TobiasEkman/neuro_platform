import mongoose, { Document, Schema } from 'mongoose';

// Define interfaces for the raw data structures
export interface MRISequenceData {
  name: string;
  parameters?: {
    TR: number;
    TE: number;
    sliceThickness: number;
  };
}

export interface ImageStudyData {
  id: string;
  type: 'MRI' | 'CT' | 'fMRI' | 'DTI';
  date: Date;
  dicomPath: string;
  sequences: MRISequenceData[];
}

export interface ICPReadingData {
  timestamp: Date;
  value: number;
  location: 'Right frontal' | 'Left frontal' | 'Right temporal' | 'Left temporal' | 'Ventricles';
  waveform: number[];
}

// Define interfaces for Mongoose documents
export interface IPatient extends Document {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  studyDate: Date;
  images: mongoose.Types.DocumentArray<ImageStudyDocument>;
  icpReadings: mongoose.Types.DocumentArray<ICPReadingDocument>;
}

export interface MRISequenceDocument extends Document, MRISequenceData {}
export interface ImageStudyDocument extends Document, ImageStudyData {
  sequences: mongoose.Types.DocumentArray<MRISequenceDocument>;
}
export interface ICPReadingDocument extends Document, ICPReadingData {}

// Schema definitions
const MRISequenceSchema = new Schema<MRISequenceDocument>({
  name: { type: String, required: true },
  parameters: {
    TR: { type: Number, required: true },
    TE: { type: Number, required: true },
    sliceThickness: { type: Number, required: true }
  }
});

const ImageStudySchema = new Schema<ImageStudyDocument>({
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

const ICPReadingSchema = new Schema<ICPReadingDocument>({
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
        return v.length === 10;
      },
      message: 'Waveform must have exactly 10 values'
    }
  }
});

const PatientSchema = new Schema<IPatient>({
  id: { 
    type: String, 
    required: true,
    unique: true,
    validate: {
      validator: function(v: string) {
        return /^PID_\d{4}$/.test(v); // Ensures format PID_XXXX
      },
      message: props => `${props.value} is not a valid patient ID format (PID_XXXX)`
    }
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

// Add indexes
PatientSchema.index({ id: 1 }); // Index on business ID
PatientSchema.index({ name: 1 });
PatientSchema.index({ studyDate: -1 });
PatientSchema.index({ 'images.type': 1 });

// Auto-increment PID function
PatientSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastPatient = await mongoose.model('Patient').findOne({}, { id: 1 }).sort({ id: -1 });
    const lastNum = lastPatient ? parseInt(lastPatient.id.split('_')[1]) : 0;
    this.id = `PID_${String(lastNum + 1).padStart(4, '0')}`;
  }
  next();
});

// Create and export the model
const Patient = mongoose.model<IPatient>('Patient', PatientSchema);
export default Patient; 