import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import dicomService from '../../services/dicomService';
import { DicomStudy, DicomSeries } from '../../types/medical';
import { Patient } from '../../types/patient';
import {
  ViewerContainer,
  ViewerGrid,
  ViewerPanel,
  Canvas,
  Controls,
  ViewerLabel,
  MainContainer,
  SidePanel,
  ListContainer,
  ListItem,
  ListTitle,
  SeriesItem
} from './styles';
import { 
  RenderingEngine,
  Types,
  Enums,
  cache as cornerstoneCache
} from '@cornerstonejs/core';

interface DicomViewerProps {
  seriesId: string | undefined;
  segmentationMask?: number[] | null;
  showSegmentation?: boolean;
  onSeriesSelect?: (seriesId: string) => void;
}

const DicomViewer: React.FC<DicomViewerProps> = ({
  seriesId: initialSeriesId,
  segmentationMask,
  showSegmentation,
  onSeriesSelect
}) => {
  // Hämta studyId från URL-parametrar om det finns
  const { studyId } = useParams<{ studyId?: string }>();
  
  // State för Canvas-referenser
  const axialRef = useRef<HTMLCanvasElement>(null);
  const [renderingEngine, setRenderingEngine] = useState<RenderingEngine | null>(null);
  
  // State för patientdata
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(studyId || null);
  const [series, setSeries] = useState<DicomSeries[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(initialSeriesId || null);
  
  // State för kontroller
  const [useMprView, setUseMprView] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ladda patienter när komponenten monteras
  useEffect(() => {
    loadPatients();
  }, []);

  // Hantera initialSeriesId om det ändras externt
  useEffect(() => {
    if (initialSeriesId && initialSeriesId !== selectedSeriesId) {
      setSelectedSeriesId(initialSeriesId);
      handleSeriesSelect(initialSeriesId);
    }
  }, [initialSeriesId]);

  // Hantera studyId från URL om det finns
  useEffect(() => {
    if (studyId && studyId !== selectedStudyId) {
      setSelectedStudyId(studyId);
      loadSeries(studyId);
    }
  }, [studyId]);

  // Initiera Cornerstone
  useEffect(() => {
    const initCornerstone = async () => {
      try {
        setLoading(true);
        // Initiera DicomService (som nu inkluderar Cornerstone och DICOM Image Loader)
        await dicomService.initialize();
        
        // Skapa rendering engine
        const engine = new RenderingEngine('myRenderingEngine');
        setRenderingEngine(engine);
        
        console.log('Cornerstone initialized successfully');
        setLoading(false);
      } catch (error) {
        console.error('Error initializing Cornerstone:', error);
        setLoading(false);
      }
    };
    
    initCornerstone();
    
    return () => {
      // Cleanup
      if (renderingEngine) {
        renderingEngine.destroy();
      }
      cornerstoneCache.purgeCache();
    };
  }, []);

  const loadPatients = async () => {
    try {
      const fetchedPatients = await dicomService.getPatients({ withDicom: true });
      
      if (Array.isArray(fetchedPatients)) {
        setPatients(fetchedPatients);
      } else {
        console.error('Fetched patients is not an array:', fetchedPatients);
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    }
  };

  const loadStudies = async (patientId: string) => {
    try {
      const fetchedStudies = await dicomService.getStudiesForPatient(patientId);
      setStudies(fetchedStudies);
      
      // Om vi har studier och inget är valt, välj det första
      if (fetchedStudies.length > 0 && !selectedStudyId) {
        setSelectedStudyId(fetchedStudies[0].study_instance_uid);
        loadSeries(fetchedStudies[0].study_instance_uid);
      }
    } catch (error) {
      console.error('Failed to load studies:', error);
    }
  };

  const loadSeries = async (studyId: string) => {
    try {
      const study = await dicomService.getStudy(studyId);
      setSeries(study.series || []);
      
      // Om vi har serier och inget är valt, välj den första
      if (study.series && study.series.length > 0 && !selectedSeriesId) {
        const firstSeriesId = study.series[0].series_instance_uid;
        setSelectedSeriesId(firstSeriesId);
        handleSeriesSelect(firstSeriesId);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
    }
  };

  const handleSeriesSelect = async (seriesId: string) => {
    try {
      setSelectedSeriesId(seriesId);
      
      // Meddela TumorAnalysis om vald serie
      if (onSeriesSelect) {
        onSeriesSelect(seriesId);
      }

      // Ladda och visa serien med Cornerstone3D
      await renderSeries(seriesId);
    } catch (error) {
      console.error('Failed to load series:', error);
      setSelectedSeriesId(null);
    }
  };

  // Förenkla renderingsfunktionen
  const renderSeries = async (seriesId: string) => {
    try {
      if (!axialRef.current || !renderingEngine) {
        console.error('Viewport element or rendering engine not available');
        return;
      }
      
      setLoading(true);
      
      // Hämta bilderna för serien
      const imageIds = await dicomService.getImageIds({ seriesId });
      
      if (imageIds.length === 0) {
        console.error('No images found for series');
        setLoading(false);
        return;
      }
      
      console.log(`Rendering ${imageIds.length} images from series ${seriesId}`);
      
      // Skapa viewport
      const viewportId = 'CT_AXIAL_STACK';
      
      // Skapa viewport-input
      const viewportInput = {
        viewportId,
        element: axialRef.current,
        type: Enums.ViewportType.STACK,
      };
      
      // I Cornerstone3D kommer enableElement att ersätta en befintlig viewport 
      // med samma ID om den redan finns, så vi behöver inte explicit ta bort den först
      renderingEngine.enableElement(viewportInput);
      
      // Hämta viewport och sätt stack
      const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport;
      
      await viewport.setStack(imageIds);
      
      // Sätt bra window/level om möjligt
      viewport.setProperties({
        voiRange: {
          // CT Window för hjärna
          lower: 0,
          upper: 80
        }
      });
      
      // Rendera viewport
      viewport.render();
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error rendering series:', error);
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(patient.patient_id);
    loadStudies(patient.patient_id);
  };

  const toggleMprView = () => {
    setUseMprView(prev => !prev);
    if (selectedSeriesId) {
      renderSeries(selectedSeriesId);
    }
  };

  return (
    <ViewerContainer>
      <MainContainer>
        <SidePanel>
          <ListContainer>
            <ListTitle>Patients</ListTitle>
            {patients.map(patient => (
              <ListItem 
                key={patient.patient_id}
                isSelected={patient.patient_id === selectedPatientId}
                onClick={() => handlePatientSelect(patient)}
              >
                {patient.name} ({patient.patient_id})
              </ListItem>
            ))}
          </ListContainer>
          
          <ListContainer>
            <ListTitle>Studies</ListTitle>
            {studies.map(study => (
              <ListItem
                key={study.study_instance_uid}
                isSelected={study.study_instance_uid === selectedStudyId}
                onClick={() => {
                  setSelectedStudyId(study.study_instance_uid);
                  loadSeries(study.study_instance_uid);
                }}
              >
                {study.description} ({study.study_date})
              </ListItem>
            ))}
          </ListContainer>
          
          <ListContainer>
            <ListTitle>Series</ListTitle>
            {series.map((series) => (
              <SeriesItem
                key={series.series_instance_uid}
                isSelected={series.series_instance_uid === selectedSeriesId}
                onClick={() => handleSeriesSelect(series.series_instance_uid)}
              >
                <div>Series {series.series_number}</div>
                <div>{series.description || 'No description'}</div>
              </SeriesItem>
            ))}
          </ListContainer>
        </SidePanel>

        <ViewerGrid>
          <ViewerPanel>
            <ViewerLabel>
              {loading ? 'Loading...' : 'DICOM-image'}
            </ViewerLabel>
            <Canvas ref={axialRef} />
            <Controls>
              <button onClick={toggleMprView}>
                {useMprView ? 'Show Stack' : 'Show MPR'} 
              </button>
            </Controls>
          </ViewerPanel>
        </ViewerGrid>
      </MainContainer>
    </ViewerContainer>
  );
};

export default DicomViewer; 