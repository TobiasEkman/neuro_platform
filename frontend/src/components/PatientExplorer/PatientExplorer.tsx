import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { patientService } from '../../services/patientService';
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaUpload } from 'react-icons/fa';
import { DicomManager } from '../DicomManager';
import { mockPatients } from '../../utils/mockData';

const Container = styled.div`
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  table-layout: fixed;
`;

const TableHeader = styled.thead`
  background: ${props => props.theme.colors.background.secondary};
`;

const TableRow = styled.tr<{ selected?: boolean }>`
  cursor: pointer;
  background-color: ${props => props.selected ? props.theme.colors.background.highlight : 'inherit'};
  
  &:hover {
    background-color: ${props => props.theme.colors.background.hover};
  }
`;

const Th = styled.th`
  padding: 1rem;
  text-align: left;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 600;
  border-bottom: 2px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.background.secondary};
`;

const Td = styled.td`
  padding: 1rem;
  text-align: left;
  vertical-align: middle;
  color: ${props => props.theme.colors.text.secondary};
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const EditableCell = styled.input`
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const SearchBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  width: 300px;
`;

const SortableHeader = styled(Th)`
  cursor: pointer;
  white-space: nowrap;
  padding: 1rem;
  
  &:hover {
    background: ${props => props.theme.colors.background.hover};
  }

  svg {
    margin-left: 0.5rem;
    vertical-align: middle;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const PageInfo = styled.div`
  color: ${props => props.theme.colors.text.secondary};
`;

const Toast = styled.div<{ type: 'success' | 'error' }>`
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 1rem;
  border-radius: 4px;
  background: ${props => props.type === 'success' ? '#4caf50' : '#f44336'};
  color: white;
  z-index: 1000;
`;

const UploadModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
`;

const FileUpload = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  border: 2px dashed ${props => props.theme.colors.border};
  border-radius: 4px;
  text-align: center;
`;

interface Patient {
  _id: string;
  name: string;
  age: number;
  diagnosis: string;
  mgmtStatus?: string;
  operativeDate?: string;
  studies?: { _id: string }[];
  [key: string]: any;
}

type SortField = 'name' | 'age' | 'diagnosis' | 'mgmtStatus' | 'operativeDate';
type SortDirection = 'asc' | 'desc';

interface PatientData {
  pid?: string;
  name: string;
  age: number;
  diagnosis: string;
  mgmtStatus?: 'Methylated' | 'Unmethylated' | 'Unknown';
  operativeDate?: string;
}

export const PatientExplorer: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'single' | 'bulk'>('single');
  const [uploadData, setUploadData] = useState<PatientData>({
    name: '',
    age: 0,
    diagnosis: '',
    mgmtStatus: 'Unknown'
  });
  
  const ITEMS_PER_PAGE = 10;

  const refreshPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientService.getPatients();
      setPatients(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch patients';
      console.error('Failed to refresh patients:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // För utveckling, använd mockdata
    setPatients(mockPatients);
    setLoading(false);
  }, []);

  const handleEdit = (patient: Patient) => {
    setEditingId(patient._id);
    setEditData({ ...patient });
  };

  const handleSave = async () => {
    if (!editData) return;

    try {
      // Konvertera studies array till rätt format
      const formattedData = {
        ...editData,
        studies: editData.studies?.map(study => study._id) || []
      };

      await patientService.updatePatient(editData._id, formattedData);
      setEditingId(null);
      setEditData(null);
      refreshPatients();
      showToast('Patient updated successfully', 'success');
    } catch (error) {
      console.error('Error saving patient:', error);
      showToast('Failed to update patient', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await patientService.deletePatient(id);
      refreshPatients();
      showToast('Patient deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting patient:', error);
      showToast('Failed to delete patient', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedPatients = React.useMemo(() => {
    return patients
      .filter(patient => 
        Object.values(patient)
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = a[sortField] ?? '';
        const bValue = b[sortField] ?? '';

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        }
        return aValue < bValue ? 1 : -1;
      });
  }, [patients, searchTerm, sortField, sortDirection]);

  const paginatedPatients = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedPatients, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedPatients.length / ITEMS_PER_PAGE);

  const handleSingleUpload = async () => {
    try {
      await patientService.updatePatient(uploadData.pid!, uploadData);
      setShowUploadModal(false);
      // Refresh patient list
      refreshPatients();
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const handleBulkUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result;
        const rows = text?.toString().split('\n');
        if (!rows) return;

        const patients = rows.slice(1).map(row => {
          const [name, age, diagnosis, mgmtStatus] = row.split(',');
          return {
            name: name.trim(),
            age: parseInt(age),
            diagnosis: diagnosis.trim(),
            mgmtStatus: mgmtStatus?.trim() as 'Methylated' | 'Unmethylated' | 'Unknown'
          };
        });

        await patientService.bulkUpdate(patients);
        setShowUploadModal(false);
        refreshPatients();
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Bulk upload error:', err);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  if (loading) {
    return (
      <Container>
        <div>Loading patients...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div>Error: {error}</div>
        <Button onClick={refreshPatients}>Retry</Button>
      </Container>
    );
  }

  return (
    <Container>
      {toast && <Toast type={toast.type}>{toast.message}</Toast>}
      
      <Header>
        <Title>Patient Explorer</Title>
        <Button onClick={() => setShowUploadModal(true)}>
          <FaUpload /> Upload Data
        </Button>
      </Header>

      <SearchBar>
        <FaSearch />
        <SearchInput
          placeholder="Search patients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchBar>

      <Table>
        <TableHeader>
          <TableRow>
            {[
              { field: 'patient_id', label: 'PID', width: '10%' },
              { field: 'name', label: 'Name', width: '20%' },
              { field: 'age', label: 'Age', width: '10%' },
              { field: 'diagnosis', label: 'Diagnosis', width: '25%' },
              { field: 'mgmtStatus', label: 'MGMT Status', width: '15%' },
              { field: 'operativeDate', label: 'Operative Date', width: '15%' },
              { field: 'studies', label: 'Has DICOM', width: '10%' }
            ].map(({ field, label, width }) => (
              <SortableHeader 
                key={field}
                style={{ width }}
                onClick={() => handleSort(field as SortField)}
              >
                {label}
                {sortField === field ? (
                  sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                ) : (
                  <FaSort />
                )}
              </SortableHeader>
            ))}
            <Th style={{ width: '15%' }}>Actions</Th>
          </TableRow>
        </TableHeader>
        <tbody>
          {paginatedPatients.map(patient => (
            <TableRow 
              key={patient._id}
              onClick={() => handleSelectPatient(patient)}
              selected={selectedPatient?._id === patient._id}
            >
              <Td>{editingId === patient._id ? (
                <EditableCell
                  value={editData?.patient_id || ''}
                  onChange={e => setEditData(prev => prev ? { ...prev, patient_id: e.target.value } : null)}
                />
              ) : patient.patient_id}</Td>
              <Td>{editingId === patient._id ? (
                <EditableCell
                  value={editData?.name || ''}
                  onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              ) : patient.name}</Td>
              <Td>{editingId === patient._id ? (
                <EditableCell
                  type="number"
                  value={editData?.age || ''}
                  onChange={e => setEditData(prev => prev ? { ...prev, age: parseInt(e.target.value) } : null)}
                />
              ) : patient.age}</Td>
              <Td>{editingId === patient._id ? (
                <EditableCell
                  value={editData?.diagnosis || ''}
                  onChange={e => setEditData(prev => prev ? { ...prev, diagnosis: e.target.value } : null)}
                />
              ) : patient.diagnosis}</Td>
              <Td>{editingId === patient._id ? (
                <EditableCell
                  value={editData?.mgmtStatus || ''}
                  onChange={e => setEditData(prev => prev ? { ...prev, mgmtStatus: e.target.value } : null)}
                />
              ) : patient.mgmtStatus}</Td>
              <Td>{editingId === patient._id ? (
                <EditableCell
                  type="date"
                  value={editData?.operativeDate?.split('T')[0] || ''}
                  onChange={e => setEditData(prev => prev ? { ...prev, operativeDate: e.target.value } : null)}
                />
              ) : patient.operativeDate?.split('T')[0]}</Td>
              <Td>
                {patient.studies && patient.studies.length > 0 ? (
                  <span style={{color: 'green'}}>✓</span>
                ) : (
                  <span style={{color: 'gray'}}>-</span>
                )}
              </Td>
              <Td>
                {editingId === patient._id ? (
                  <>
                    <Button onClick={handleSave}>Save</Button>
                    <Button onClick={() => setEditingId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => handleEdit(patient)}>Edit</Button>
                    <Button onClick={() => handleDelete(patient._id)}>Delete</Button>
                  </>
                )}
              </Td>
            </TableRow>
          ))}
        </tbody>
      </Table>

      <Pagination>
        <Button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <PageInfo>
          Page {currentPage} of {totalPages}
        </PageInfo>
        <Button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </Pagination>

      {showUploadModal && (
        <UploadModal>
          <h2>Upload Patient Data</h2>
          <div>
            <Button onClick={() => setUploadType('single')}>Single Patient</Button>
            <Button onClick={() => setUploadType('bulk')}>Bulk Upload</Button>
          </div>

          {uploadType === 'single' ? (
            <div>
              <input
                type="text"
                placeholder="PID"
                value={uploadData.pid || ''}
                onChange={e => setUploadData({...uploadData, pid: e.target.value})}
              />
              <select
                value={uploadData.mgmtStatus}
                onChange={e => setUploadData({...uploadData, mgmtStatus: e.target.value as any})}
              >
                <option value="Unknown">Unknown</option>
                <option value="Methylated">Methylated</option>
                <option value="Unmethylated">Unmethylated</option>
              </select>
              <Button onClick={handleSingleUpload}>Update</Button>
            </div>
          ) : (
            <FileUpload>
              <p>Upload CSV file with columns: name,age,diagnosis,mgmtStatus</p>
              <input
                type="file"
                accept=".csv"
                onChange={e => e.target.files && handleBulkUpload(e.target.files[0])}
              />
            </FileUpload>
          )}
          
          <Button onClick={() => setShowUploadModal(false)}>Close</Button>
        </UploadModal>
      )}


    </Container>
  );
}; 