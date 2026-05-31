// utilidades para archivos (token, descargas, tipos...)

export const getAuthToken = (): string => {
  return localStorage.getItem('auth_token') || '';
};

export const getAuthenticatedUrl = (url: string): string => {
  const token = getAuthToken();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

export const downloadFile = (
  fileId: string,
  fileName?: string,
  t?: (key: string) => string
): void => {
  try {
    const token = getAuthToken();
    const downloadUrl = `/api/files/download/${encodeURIComponent(
      fileId
    )}?download=true&token=${encodeURIComponent(token)}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error initiating download:', error);
    if (t) {
      alert(t('common.downloadError'));
    } else {
      alert('Error initiating download');
    }
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

export const getFileType = (filename: string): string => {
  if (!filename) return 'file';
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
  if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'php'].includes(ext))
    return 'text';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'file';
};

export const getFileIcon = (filename: string): string => {
  const type = getFileType(filename);
  const icons: { [key: string]: string } = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    pdf: '📄',
    word: '📝',
    excel: '📊',
    powerpoint: '📽️',
    text: '📄',
    archive: '🗜️',
    file: '📄',
  };
  return icons[type] || '📄';
};

export const canPreview = (filename: string): boolean => {
  const type = getFileType(filename);
  return ['image', 'video', 'pdf', 'text', 'word', 'excel', 'powerpoint'].includes(type);
};

export const canEdit = (filename: string): boolean => {
  const type = getFileType(filename);
  return ['word', 'excel', 'powerpoint', 'pdf'].includes(type);
};

export const getAuthenticatedPreviewUrl = async (
  fileId: string,
  filename?: string
): Promise<string | null> => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    return `/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`;
  } catch (error) {
    console.error('Error getting preview URL:', error);
    return null;
  }
};
