interface Window {
  volumeDimensions?: number[];
}

// Eller mer specifikt:
interface Window {
  volumeDimensions?: {
    width: number;
    height: number;
    depth: number;
  };
} 