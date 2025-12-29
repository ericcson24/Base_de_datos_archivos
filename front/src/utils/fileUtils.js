
export const getAuthToken = () => {
  return localStorage.getItem('auth_token') || '';
};

export const getAuthenticatedUrl = (url) => {
  const token = getAuthToken();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

export const downloadFile = (fileId, fileName) => {
  try {
    const token = getAuthToken();
    const downloadUrl = `/api/files/download/${fileId}?download=true&token=${encodeURIComponent(token)}`;

    // Create a hidden link to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error initiating download:', error);
    alert('Error al iniciar la descarga');
  }
};

export const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

export const getFileType = (filename) => {
  if (!filename) return 'file';
  const ext = filename.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
  if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'php'].includes(ext)) return 'text';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'file';
};

export const getFileIcon = (filename) => {
  const type = getFileType(filename);
  const icons = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    pdf: '📄',
    word: '📝',
    excel: '📊',
    powerpoint: '📽️',
    text: '📄',
    archive: '📦',
    file: '📄'
  };
  return icons[type] || '📄';
};

export const canPreview = (filename) => {
  const type = getFileType(filename);
  return ['image', 'video', 'pdf', 'text'].includes(type);
};

export const getAuthenticatedPreviewUrl = async (fileId, filename) => {
  const type = getFileType(filename);
  if (!canPreview(filename)) return null;

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const response = await fetch(`/api/files/preview/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return null;

    if (type === 'image') {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }

    return `/api/files/preview/${fileId}?token=${encodeURIComponent(token)}`;

  } catch (error) {
    console.error('Error obteniendo preview autenticada:', error);
    return null;
  }
};
