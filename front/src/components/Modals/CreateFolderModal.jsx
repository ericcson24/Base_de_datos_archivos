import React from 'react';

const CreateFolderModal = ({ 
  isOpen, 
  onClose, 
  newFolderName, 
  setNewFolderName, 
  handleCreateFolder 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glassmorphism-modal dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Nueva Carpeta</h3>
        <input
          type="text"
          placeholder="Nombre de la carpeta"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          className="w-full px-3 py-2 glassmorphism-input dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 mb-4"
          autoFocus
        />
        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
          >
            Cancelar
          </button>
          <button 
            onClick={handleCreateFolder}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderModal;
