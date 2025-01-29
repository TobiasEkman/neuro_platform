import { useState, useEffect } from 'react';

export const usePatients = () => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  return { patients, isLoading };
}; 