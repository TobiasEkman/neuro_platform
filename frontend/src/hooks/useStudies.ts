import { useState, useEffect } from 'react';

export const useStudies = () => {
  const [studies, setStudies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  return { studies, isLoading };
}; 