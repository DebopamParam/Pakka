export async function toWav(recording: Blob) {
  if (!recording.size) throw new Error('Hold the microphone while speaking, then release to send.')

  const decoder = new AudioContext()
  try {
    const decoded = await decoder.decodeAudioData(await recording.arrayBuffer())
    const sampleRate = 16000
    const frames = Math.max(1, Math.round(decoded.duration * sampleRate))
    const resampler = new OfflineAudioContext(1, frames, sampleRate)
    const source = resampler.createBufferSource()
    source.buffer = decoded
    source.connect(resampler.destination)
    source.start()
    const samples = (await resampler.startRendering()).getChannelData(0)

    const headerBytes = 44
    const sampleBytes = samples.length * 2
    const buffer = new ArrayBuffer(headerBytes + sampleBytes)
    const data = new DataView(buffer)
    const write = (offset: number, text: string) => {
      Array.from(text).forEach((char, index) => data.setUint8(offset + index, char.charCodeAt(0)))
    }

    write(0, 'RIFF')
    data.setUint32(4, 36 + sampleBytes, true)
    write(8, 'WAVE')
    write(12, 'fmt ')
    data.setUint32(16, 16, true)
    data.setUint16(20, 1, true)
    data.setUint16(22, 1, true)
    data.setUint32(24, sampleRate, true)
    data.setUint32(28, sampleRate * 2, true)
    data.setUint16(32, 2, true)
    data.setUint16(34, 16, true)
    write(36, 'data')
    data.setUint32(40, sampleBytes, true)

    samples.forEach((sample, index) => {
      const clipped = Math.max(-1, Math.min(1, sample))
      data.setInt16(headerBytes + index * 2, clipped * (clipped < 0 ? 32768 : 32767), true)
    })
    return new Blob([buffer], { type: 'audio/wav' })
  } finally {
    await decoder.close()
  }
}
