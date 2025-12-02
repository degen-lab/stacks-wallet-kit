export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
export const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'
export const DOWNLOAD_API_ENDPOINT = (fileId: string) =>
  `${DRIVE_API_BASE}/files/${fileId}?alt=media`
