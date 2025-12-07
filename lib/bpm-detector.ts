// BPM detection using beat detection algorithm
export class BPMDetector {
  private sampleRate: number

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate
  }

  // Detect BPM from audio buffer using autocorrelation
  async detectBPM(audioBuffer: AudioBuffer): Promise<number> {
    const channelData = audioBuffer.getChannelData(0)

    // Analyze first 30 seconds max
    const analyzeLength = Math.min(audioBuffer.length, this.sampleRate * 30)
    const data = channelData.slice(0, analyzeLength)

    // Calculate energy envelope
    const windowSize = Math.floor(this.sampleRate / 10) // 100ms windows
    const energyEnvelope: number[] = []

    for (let i = 0; i < data.length - windowSize; i += windowSize / 2) {
      let energy = 0
      for (let j = 0; j < windowSize; j++) {
        energy += Math.abs(data[i + j])
      }
      energyEnvelope.push(energy / windowSize)
    }

    // Find peaks in energy envelope
    const peaks = this.findPeaks(energyEnvelope)

    // Calculate intervals between peaks
    const intervals: number[] = []
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1])
    }

    if (intervals.length === 0) return 120 // Default

    // Find most common interval (mode)
    const intervalCounts = new Map<number, number>()
    intervals.forEach((interval) => {
      const rounded = Math.round(interval / 2) * 2 // Group similar intervals
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1)
    })

    let maxCount = 0
    let mostCommonInterval = 0
    intervalCounts.forEach((count, interval) => {
      if (count > maxCount) {
        maxCount = count
        mostCommonInterval = interval
      }
    })

    // Convert interval to BPM
    // interval is in half-windows (50ms each)
    const intervalMs = mostCommonInterval * 50
    if (intervalMs === 0) return 120

    const bpm = 60000 / intervalMs

    // Clamp to reasonable range (60-180 BPM)
    return Math.max(60, Math.min(180, Math.round(bpm)))
  }

  private findPeaks(data: number[]): number[] {
    const peaks: number[] = []
    const threshold = this.calculateThreshold(data)

    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > threshold) {
        peaks.push(i)
      }
    }

    return peaks
  }

  private calculateThreshold(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b)
    // Use 70th percentile as threshold
    return sorted[Math.floor(sorted.length * 0.7)]
  }
}
