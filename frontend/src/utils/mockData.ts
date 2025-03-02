export const mockPatients = [
  {
    _id: "1",
    patient_id: "PID_0001",
    name: "Anonymous",
    age: 56,
    diagnosis: "Glioblastoma multiforme",
    mgmtStatus: "Methylated",
    operativeDate: "2024-02-15",
    studies: []
  },
  {
    _id: "2",
    patient_id: "PID_0002",
    name: "Anonymous",
    age: 45,
    diagnosis: "Anaplastic astrocytoma",
    mgmtStatus: "Unmethylated",
    operativeDate: "2024-03-01",
    studies: []
  },
  {
    _id: "3",
    patient_id: "PID_0003",
    name: "Anonymous",
    age: 62,
    diagnosis: "Meningioma",
    mgmtStatus: "Unknown",
    operativeDate: "2024-03-10",
    studies: []
  },
  {
    _id: "4",
    patient_id: "PID_0004",
    name: "Anonymous",
    age: 51,
    diagnosis: "Oligodendroglioma",
    mgmtStatus: "Methylated",
    operativeDate: "2024-02-28",
    studies: []
  },
  {
    _id: "5",
    patient_id: "PID_0005",
    name: "Anonymous",
    age: 48,
    diagnosis: "Low-grade glioma",
    mgmtStatus: "Unmethylated",
    operativeDate: "2024-03-05",
    studies: []
  }
];

export const mockPatient = {
  _id: "demo_patient",
  patient_id: "PID_DEMO",
  name: "Demo Patient",
  age: 45,
  diagnosis: "Glioblastoma",
  images: [
    {
      dicomPath: "/demo/path/to/image.dcm",
      type: "MRI",
      date: new Date().toISOString()
    }
  ]
};

export const mockTumorAnalysis = {
  eloquentAreas: ['Motor cortex', 'Speech area'],
  vesselInvolvement: ['MCA', 'ACA'],
  volumeCc: 45.2,
  predictedResectionRate: 0.85
}; 