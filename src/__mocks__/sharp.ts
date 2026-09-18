const sharpMockInstance = {
  grayscale: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  normalize: jest.fn().mockReturnThis(),
  sharpen: jest.fn().mockReturnThis(),
  threshold: jest.fn().mockReturnThis(),
  negate: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-processed-buffer')),
}

const sharpMock = Object.assign(
  jest.fn(() => sharpMockInstance),
  sharpMockInstance,
)

export default sharpMock
