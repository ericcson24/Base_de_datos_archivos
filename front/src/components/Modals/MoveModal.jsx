import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';

const MoveModal = ({ isOpen, onClose, itemToMove, onMove }) => {
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPath([]); // Reset path when opening
      loadFolders([]);
    }
  }, [isOpen]);

  const loadFolders = async (path) => {
    setLoading(true);
    try {
      const pathString = path.join('/');
      const response = await fetch(`/api/files?path=${pathString}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await response.json();
      
      const folderList = (data.files || []).filter(f => f.type === 'folder');
      setFolders(folderList);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderName) => {
    const newPath = [...currentPath, folderName];
    setCurrentPath(newPath);
    loadFolders(newPath);
  };

  const handleBreadcrumbClick = (index) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);
    loadFolders(newPath);
  };

  const handleRootClick = () => {
    setCurrentPath([]);
    loadFolders([]);
  };

  const handleMove = () => {
    onMove(itemToMove, currentPath.join('/'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-600 w-full max-w-lg mx-4 flex flex-col max-h-[85vh] overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
            <span className="mr-2 text-xl">🚚</span>
            {t('move.title', { name: itemToMove?.name })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Breadcrumbs */}
        <div className="px-4 py-3 bg-gray-100 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button 
            onClick={handleRootClick}
            className={`flex items-center text-sm ${currentPath.length === 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400 hover:text-blue-500'}`}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {t('move.home')}
          </button>
          
          {currentPath.map((folder, index) => (
            <React.Fragment key={index}>
              <span className="mx-2 text-gray-400">/</span>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`text-sm ${index === currentPath.length - 1 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400 hover:text-blue-500'}`}
              >
                {folder}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px] bg-white dark:bg-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <span>{t('move.loadingFolders')}</span>
            </div>
          ) : (
            <div className="space-y-1">
              {currentPath.length > 0 && (
                <div 
                  className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer flex items-center group transition-colors"
                  onClick={() => {
                    const newPath = currentPath.slice(0, -1);
                    setCurrentPath(newPath);
                    loadFolders(newPath);
                  }}
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-slate-700 rounded-lg mr-3 text-gray-500 group-hover:bg-blue-100 dark:group-hover:bg-slate-600 group-hover:text-blue-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-slate-200">{t('move.upLevel')}</span>
                  </div>
                </div>
              )}

              {folders.map(folder => (
                <div 
                  key={folder.id} 
                  className={`p-3 rounded-lg flex items-center transition-colors border border-transparent ${
                    itemToMove?.id === folder.id 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-800/50' 
                      : 'hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer hover:border-blue-100 dark:hover:border-slate-600'
                  }`}
                  onClick={() => {
                    if (itemToMove?.id !== folder.id) {
                      handleFolderClick(folder.name);
                    }
                  }}
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3 text-yellow-600 dark:text-yellow-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700 dark:text-slate-200">{folder.name}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{t('move.folder')}</span>
                  </div>
                  <div className="ml-auto text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
              
              {!loading && folders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                  <svg className="w-16 h-16 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                  <p>{t('userPanel.emptyFolder')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
            {t('move.destination')} <span className="font-medium text-gray-700 dark:text-slate-300">/{currentPath.join('/')}</span>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200 font-medium"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={handleMove}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 shadow-lg shadow-blue-500/30 font-medium flex items-center"
            >
              <span className="mr-2">{t('move.moveHere')}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveModal;
