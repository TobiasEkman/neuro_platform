importScripts('https://unpkg.com/comlink/dist/umd/comlink.js');

// Objektet som exponerar våra funktioner
const cornerstoneWorker = {
  // Exempelfunktion för laddningsprogress
  updateProgress({ current, total }) {
    const percentage = Math.round((current / total) * 100);
    return { current, total, percentage };
  },
  
  // Funktion för att behandla pixeldata
  processPixelData({ pixelData, width, height, windowCenter, windowWidth }) {
    // Exempel på bildbehandling
    const newPixelData = new Uint8Array(pixelData.length);
    
    // Kopiera och processera data
    for (let i = 0; i < pixelData.length; i++) {
      // Enkelt exempel på fönsterbredd/nivå-justering
      let pixel = pixelData[i];
      // Applicera fönster
      pixel = ((pixel - (windowCenter - 0.5)) / (windowWidth - 1) + 0.5) * 255;
      // Klipp av värden utanför [0, 255]
      pixel = Math.min(Math.max(pixel, 0), 255);
      
      newPixelData[i] = pixel;
    }
    
    return newPixelData;
  },
  

};

// Exponera objektet med comlink
Comlink.expose(cornerstoneWorker); 