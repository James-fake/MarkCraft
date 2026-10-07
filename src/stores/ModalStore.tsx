import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ModalType = 'none' | 'input' | 'create-file';

interface ModalProviderProps {
  children: React.ReactNode;
  createFileTitle?: string;
}

interface ModalContextType {
  openInputModal: (config: {
    title: string;
    placeholder: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
  }) => void;
  openCreateFileModal: (config: {
    defaultFolderId: string;
    onConfirm: (fileName: string, folderId: string) => void;
  }) => void;
  modalState: {
    isOpen: boolean;
    type: ModalType;
    title: string;
    placeholder: string;
    defaultValue: string;
    defaultFolderId: string;
  };
  closeModal: () => void;
  handleInputConfirm: (value: string) => void;
  handleCreateFileConfirm: (fileName: string, folderId: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<ModalProviderProps> = ({ children, createFileTitle = 'Create File' }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    placeholder: string;
    defaultValue: string;
    defaultFolderId: string;
  }>({
    isOpen: false,
    type: 'none',
    title: '',
    placeholder: '',
    defaultValue: '',
    defaultFolderId: 'root',
  });

  const onInputConfirmRef = useRef<(value: string) => void>(() => {});
  const onCreateFileConfirmRef = useRef<(fileName: string, folderId: string) => void>(() => {});

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false, type: 'none' }));
  }, []);

  const openInputModal = useCallback((config: {
    title: string;
    placeholder: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
  }) => {
    onInputConfirmRef.current = config.onConfirm;
    setModalState({
      isOpen: true,
      type: 'input',
      title: config.title,
      placeholder: config.placeholder,
      defaultValue: config.defaultValue || '',
      defaultFolderId: 'root',
    });
  }, []);

  const openCreateFileModal = useCallback((config: {
    defaultFolderId: string;
    onConfirm: (fileName: string, folderId: string) => void;
  }) => {
    onCreateFileConfirmRef.current = config.onConfirm;
    setModalState({
      isOpen: true,
      type: 'create-file',
      title: createFileTitle,
      placeholder: '',
      defaultValue: '',
      defaultFolderId: config.defaultFolderId,
    });
  }, [createFileTitle]);

  const handleInputConfirm = useCallback((value: string) => {
    onInputConfirmRef.current(value);
    closeModal();
  }, [closeModal]);

  const handleCreateFileConfirm = useCallback((fileName: string, folderId: string) => {
    onCreateFileConfirmRef.current(fileName, folderId);
  }, []);

  return (
    <ModalContext.Provider value={{
      openInputModal,
      openCreateFileModal,
      modalState: {
        isOpen: modalState.isOpen,
        type: modalState.type,
        title: modalState.title,
        placeholder: modalState.placeholder,
        defaultValue: modalState.defaultValue,
        defaultFolderId: modalState.defaultFolderId,
      },
      closeModal,
      handleInputConfirm,
      handleCreateFileConfirm,
    }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
