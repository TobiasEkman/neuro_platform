export class StreamProcessor {
  static async processLargeDicom(file: File): Promise<ArrayBuffer> {
    const chunks: Uint8Array[] = [];
    const stream = file.stream();
    const reader = stream.getReader();

    let totalSize = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        totalSize += value.length;
        
        // Shows loading progress in console
        const progress = (totalSize / file.size) * 100;
        console.log(`Loading: ${progress.toFixed(1)}%`);
      }

      // Combines chunks into final ArrayBuffer
      const result = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result.buffer;
    } finally {
      reader.releaseLock(); // Important: releases memory
    }
  }
} 