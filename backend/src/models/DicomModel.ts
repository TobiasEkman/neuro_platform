import mongoose, { Document, Schema } from 'mongoose';

export interface IDicomMetadata extends Document {
  patientId: mongoose.Types.ObjectId;
  study_instance_uid: string;
  series_uid: string;
  sop_instance_uid?: string;
  modality: string;
  study_date?: Date;
  series_number?: number;
  series_description?: string;
  filePath: string;
  metadata?: Record<string, any>;
}

const DicomMetadataSchema = new Schema<IDicomMetadata>({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },
  study_instance_uid: { 
    type: String, 
    required: true 
  },
  series_uid: { 
    type: String, 
    required: true 
  },
  sop_instance_uid: { 
    type: String 
  },
  modality: { 
    type: String, 
    required: true 
  },
  study_date: { 
    type: Date 
  },
  series_number: { 
    type: Number 
  },
  series_description: { 
    type: String 
  },
  filePath: { 
    type: String, 
    required: true 
  },
  metadata: { 
    type: Schema.Types.Mixed 
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
DicomMetadataSchema.index({ study_instance_uid: 1 });
DicomMetadataSchema.index({ series_uid: 1 });
DicomMetadataSchema.index({ patientId: 1 });

export const DicomModel = mongoose.model<IDicomMetadata>('DicomMetadata', DicomMetadataSchema); 